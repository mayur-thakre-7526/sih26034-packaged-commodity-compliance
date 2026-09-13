"""compliance_service API -- ties image_processing -> ocr -> rule_engine
together into one /scan endpoint.

NOTE: fastapi/pydantic could not be installed/executed in the sandbox this
was written in (no network access), so this file is reviewed line-by-line
but NOT run end-to-end the way ocr_engine.py/extraction.py/rule_engine
were. Test it in your actual dev environment before demoing.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
import time
import uuid
from typing import List
import cv2
from fastapi import FastAPI, File, HTTPException, UploadFile
from pydantic import BaseModel

from image_processing.app.pipeline import (
    boundary_detection as boundary,
    calibration,
    enhancement,
    geometric_correction as perspective,
    validation,
)
from ocr.extraction import extract_declarations
from ocr.ocr_engine import get_reader, run_ocr
from rule_engine.engine import run_all_checks


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Pre-warm the EasyOCR readers at application startup so the first scan
    does not incur model download or initial weight-loading latency."""
    get_reader(["en"])
    get_reader(["en", "hi"])
    yield


app = FastAPI(title="Legal Metrology Compliance Service", lifespan=lifespan)


class ScanResponse(BaseModel):
    scan_id: str
    quality_flags: list
    declarations: dict
    compliance: dict
    calibration: dict
    processing_ms: float


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/scan", response_model=ScanResponse)
async def scan_product(
    files: List[UploadFile] = File(...),
    reference_object_present: bool = False,
    known_package_width_mm: float | None = None,
    is_imported: bool = False,
    is_textile_item: bool = False,
    is_ecommerce_listing: bool = False,
):
    """Full pipeline: validate -> find boundary -> rectify -> enhance ->
    OCR -> extract declarations -> run Legal Metrology rule checks.

    `is_imported` / `is_textile_item` / `is_ecommerce_listing` are passed
    in explicitly rather than guessed from the image, since they change
    which rules even apply (Rule 14, Rule 6(10), country-of-origin
    requirement) and guessing wrong would silently skip real violations.
    """
    start = time.perf_counter()
    scan_id = str(uuid.uuid4())

    all_quality_flags = []
    combined_full_text = ""
    combined_lines = []
    final_calibration_result = None

    for idx, file in enumerate(files):
        t_decode_start = time.perf_counter()
        raw_bytes = await file.read()
        try:
            validation_result = validation.decode_and_validate(raw_bytes)
        except Exception as exc:
            continue
        decode_ms = (time.perf_counter() - t_decode_start) * 1000

        t_prep_start = time.perf_counter()
        image = validation_result.image_bgr
        orig_h, orig_w = image.shape[:2]

        # Early downscaling to max 1600px while preserving aspect ratio
        max_dim = max(orig_h, orig_w)
        if max_dim > 1600:
            scale = 1600.0 / float(max_dim)
            new_w = max(1, int(round(orig_w * scale)))
            new_h = max(1, int(round(orig_h * scale)))
            image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

        all_quality_flags.extend(validation_result.flags)

        boundary_result = boundary.detect_boundary(image)
        correction_result = perspective.correct_geometry(image, boundary_result)
        all_quality_flags.extend(correction_result.flags)
        if correction_result.corrected and correction_result.image_bgr is not None and correction_result.image_bgr.size > 0:
            image = correction_result.image_bgr

        image = enhancement.enhance(image)

        if idx == 0:
            final_calibration_result = calibration.resolve_calibration(
                image_bgr=image,
                reference_object_present=reference_object_present,
                known_package_width_mm=known_package_width_mm,
            )
        prep_ms = (time.perf_counter() - t_prep_start) * 1000

        t_ocr_start = time.perf_counter()
        ocr_result = run_ocr(image)
        ocr_ms = (time.perf_counter() - t_ocr_start) * 1000

        combined_full_text += ocr_result.full_text + "\n\n"
        combined_lines.extend(ocr_result.lines)

        print(
            f"[PERF] Image {idx} ({orig_w}x{orig_h} -> {image.shape[1]}x{image.shape[0]}): "
            f"decode={decode_ms:.1f}ms, prep={prep_ms:.1f}ms, ocr={ocr_ms:.1f}ms, "
            f"detections={len(ocr_result.lines)}"
        )

    if final_calibration_result is None:
        from image_processing.app.schemas import CalibrationResult
        final_calibration_result = CalibrationResult(method="none", px_per_mm=None)

    from ocr.ocr_engine import OCRResult
    combined_ocr_result = OCRResult(full_text=combined_full_text, lines=combined_lines)

    t_extract_start = time.perf_counter()
    declarations = extract_declarations(combined_ocr_result)
    extract_ms = (time.perf_counter() - t_extract_start) * 1000

    # Fields the image alone can't tell us -- caller-supplied, not guessed.
    declarations.category.is_imported = is_imported
    declarations.category.is_textile_item = is_textile_item
    declarations.is_ecommerce_listing = is_ecommerce_listing

    t_rules_start = time.perf_counter()
    report = run_all_checks(declarations)
    rules_ms = (time.perf_counter() - t_rules_start) * 1000

    elapsed_ms = (time.perf_counter() - start) * 1000
    deduped_flags = list(dict.fromkeys(all_quality_flags))

    print(
        f"[PERF] Scan {scan_id[:8]}: extract={extract_ms:.2f}ms, "
        f"rules={rules_ms:.2f}ms, total_python={elapsed_ms:.1f}ms"
    )

    return ScanResponse(
        scan_id=scan_id,
        quality_flags=[f.value for f in deduped_flags],
        declarations=declarations.model_dump(),
        compliance=report.model_dump(),
        calibration=final_calibration_result.model_dump(),
        processing_ms=round(elapsed_ms, 2),
    )
