"""Thin wrapper around EasyOCR. Owns nothing about Legal Metrology
rules -- just turns a rectified label image into structured OCR output
(lines of text with bounding boxes and confidence). `extraction.py` is
what knows about MRP/net-quantity/etc. patterns.

Kept deliberately separate from extraction.py so the OCR engine itself
(EasyOCR today) can be swapped for PaddleOCR/Tesseract/a cloud OCR API
later without touching any Legal Metrology parsing logic -- this is the
same OCRLine/OCRResult/run_ocr contract the pytesseract version used, so
extraction.py requires no changes for this swap.

Why EasyOCR over pytesseract: meaningfully better accuracy on photographed
packaging (small/dense print, curved surfaces, mixed English/Devanagari)
than Tesseract, which is tuned for clean scanned documents. See the
project discussion for the EasyOCR-vs-PaddleOCR trade-off -- EasyOCR was
chosen here for lower install/environment risk (PyTorch-based, no separate
framework install) at a small accuracy cost relative to PaddleOCR.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np
import easyocr


@dataclass
class OCRLine:
    text: str
    x1: int
    y1: int
    x2: int
    y2: int
    confidence: float  # 0.0-1.0


@dataclass
class OCRResult:
    lines: List[OCRLine] = field(default_factory=list)
    full_text: str = ""

    def height_of(self, line: OCRLine) -> int:
        return line.y2 - line.y1


# EasyOCR's Reader loads detection + recognition model weights on
# construction, which is expensive (can be several seconds, plus a one-time
# model download on first run) -- unlike pytesseract, which has no
# comparable setup cost per call. Build the reader once per language set
# and reuse it across requests rather than constructing it per call.
_reader: Optional["easyocr.Reader"] = None
_reader_langs: Optional[List[str]] = None

DEFAULT_LANGUAGES = ["en", "hi"]  # English + Hindi/Devanagari, per the
                                   # multilingual-label requirement.


def get_reader(languages: Optional[List[str]] = None) -> "easyocr.Reader":
    """Returns a cached Reader for the given language set, constructing it
    on first use. Pass gpu=True at construction (edit below) if the
    deployment environment has a CUDA GPU available -- CPU inference works
    but is noticeably slower for EasyOCR than for Tesseract."""
    global _reader, _reader_langs
    languages = languages or DEFAULT_LANGUAGES
    if _reader is None or _reader_langs != languages:
        _reader = easyocr.Reader(languages, gpu=False)
        _reader_langs = languages
    return _reader


def _polygon_to_bbox(polygon) -> Tuple[int, int, int, int]:
    """EasyOCR returns each detection's box as a 4-point polygon (not
    necessarily axis-aligned, since text can be slightly rotated even after
    rectification). Collapse it to an axis-aligned bounding box, matching
    the OCRLine contract the rest of the pipeline (and font-size
    measurement downstream) expects."""
    xs = [point[0] for point in polygon]
    ys = [point[1] for point in polygon]
    return int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))


def run_ocr(image_bgr: np.ndarray, languages: Optional[List[str]] = None) -> OCRResult:
    """Runs EasyOCR on a rectified (post image_processing pipeline) label
    image and returns line/phrase-level output, sorted top-to-bottom.

    Expects the image to already be validated/boundary-corrected/enhanced
    -- i.e. the output of image_processing.enhancement, not a raw photo.

    Unlike Tesseract (word-level output that this module had to group into
    lines via block/paragraph/line indices), EasyOCR's CRAFT-based detector
    already groups nearby word regions into single text-line/phrase boxes,
    so each detection from readtext() maps directly to one OCRLine -- no
    separate grouping step is needed here.

    paragraph=False is used deliberately: EasyOCR's paragraph=True mode
    merges multiple text lines into larger paragraph blocks, which would
    lose the per-line bounding-box height that the font-size compliance
    check (Rule 7) depends on.
    """
    reader = get_reader(languages)

    # EasyOCR accepts BGR numpy arrays directly (it reads images via OpenCV
    # internally), so no colour-space conversion is needed here, unlike the
    # grayscale conversion the pytesseract version required.
    detections = reader.readtext(image_bgr, detail=1, paragraph=False)

    lines: List[OCRLine] = []
    for polygon, text, confidence in detections:
        text = text.strip()
        if not text:
            continue
        x1, y1, x2, y2 = _polygon_to_bbox(polygon)
        lines.append(OCRLine(
            text=text,
            x1=x1, y1=y1, x2=x2, y2=y2,
            confidence=round(float(confidence), 2),
        ))

    # Sort top-to-bottom (then left-to-right on ties) so full_text reads
    # like the label, matching the ordering behaviour of the tesseract
    # version (which sorted by block/par/line position).
    lines.sort(key=lambda line: (line.y1, line.x1))

    full_text = "\n".join(line.text for line in lines)
    return OCRResult(lines=lines, full_text=full_text)
