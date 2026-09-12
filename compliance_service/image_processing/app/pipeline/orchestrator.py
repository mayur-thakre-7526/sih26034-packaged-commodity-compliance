"""Orchestrator — chains Stages 1-6 into the single pipeline described in the
design discussion, and shapes the result into the API response contract.

Kept deliberately thin: each stage's module owns its own logic, so this file
should mostly just be sequencing, flag aggregation, and error handling.
"""

import time
from typing import List

from image_processing.app.pipeline import (
    boundary_detection,
    calibration,
    enhancement,
    geometric_correction,
    glare_detection,
    validation,
)
from image_processing.app.schemas import ProcessImageRequest, ProcessImageResponse, QualityFlag
from image_processing.app.storage import download_image, upload_rectified_image


class ProcessingFailedError(Exception):
    pass


def process_image(request: ProcessImageRequest) -> ProcessImageResponse:
    start = time.perf_counter()
    all_flags: List[QualityFlag] = []

    # --- Stage 1: validation & normalization ---
    try:
        raw_bytes = download_image(request.image_url)
    except Exception as exc:
        raise ProcessingFailedError(f"Could not fetch image for scan {request.scan_id}: {exc}") from exc

    try:
        validation_result = validation.decode_and_validate(raw_bytes)
    except validation.InvalidImageError as exc:
        raise ProcessingFailedError(str(exc)) from exc

    image = validation_result.image_bgr
    all_flags.extend(validation_result.flags)

    # --- Stage 2: boundary detection ---
    boundary = boundary_detection.detect_boundary(image)

    # --- Stage 3: geometric correction ---
    correction_result = geometric_correction.correct_geometry(image, boundary)
    image = correction_result.image_bgr
    all_flags.extend(correction_result.flags)

    # --- Stage 4: enhancement ---
    image = enhancement.enhance(image)

    # --- Stage 5: glare detection ---
    glare_result = glare_detection.detect_glare(image)
    if glare_result.severe:
        all_flags.append(QualityFlag.SEVERE_GLARE)
    elif glare_result.glare_area_ratio > 0:
        all_flags.append(QualityFlag.PARTIAL_GLARE)

    # --- Calibration (feeds the downstream font-size analyzer service) ---
    calibration_result = calibration.resolve_calibration(
        image_bgr=image,
        reference_object_present=request.reference_object_present,
        known_package_width_mm=request.known_package_width_mm,
    )

    # --- Persist rectified image ---
    rectified_url = upload_rectified_image(request.scan_id, image)

    elapsed_ms = (time.perf_counter() - start) * 1000

    # de-duplicate flags while preserving order
    deduped_flags = list(dict.fromkeys(all_flags))

    return ProcessImageResponse(
        scan_id=request.scan_id,
        rectified_image_url=rectified_url,
        quality_flags=deduped_flags,
        calibration=calibration_result,
        processing_ms=round(elapsed_ms, 2),
    )
