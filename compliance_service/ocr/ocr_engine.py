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

import cv2
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
# comparable setup cost per call. Cache readers by language tuple across requests.
_readers: dict[tuple[str, ...], "easyocr.Reader"] = {}

DEFAULT_LANGUAGES = ["en", "hi"]  # English + Hindi/Devanagari, per the
                                   # multilingual-label requirement.


def get_reader(languages: Optional[List[str]] = None) -> "easyocr.Reader":
    """Returns a cached Reader for the given language set, constructing it
    on first use. Pass gpu=True at construction if the deployment environment
    has a CUDA GPU available -- CPU inference works but is noticeably slower."""
    global _readers
    langs = tuple(languages or DEFAULT_LANGUAGES)
    if langs not in _readers:
        _readers[langs] = easyocr.Reader(list(langs), gpu=False)
    return _readers[langs]


def _polygon_to_bbox(polygon) -> Tuple[int, int, int, int]:
    """EasyOCR returns each detection's box as a 4-point polygon (not
    necessarily axis-aligned, since text can be slightly rotated even after
    rectification). Collapse it to an axis-aligned bounding box, matching
    the OCRLine contract the rest of the pipeline (and font-size
    measurement downstream) expects."""
    xs = [point[0] for point in polygon]
    ys = [point[1] for point in polygon]
    return int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))


MAX_OCR_DIMENSION = 1600


def downscale_image_for_ocr(
    image_bgr: np.ndarray,
    max_dimension: int = MAX_OCR_DIMENSION,
) -> Tuple[np.ndarray, float]:
    """Downscales image so max(width, height) <= max_dimension while preserving aspect ratio.

    Returns:
        A tuple of (downscaled_image, scale_factor), where scale_factor = downscaled / original.
        If the image is already within max_dimension, returns (image_bgr, 1.0) without copying.
    """
    height, width = image_bgr.shape[:2]
    longest_side = max(height, width)
    if longest_side <= max_dimension:
        return image_bgr, 1.0

    scale = max_dimension / float(longest_side)
    new_width = max(1, int(round(width * scale)))
    new_height = max(1, int(round(height * scale)))
    downscaled = cv2.resize(image_bgr, (new_width, new_height), interpolation=cv2.INTER_AREA)
    return downscaled, scale


def _is_meaningful_text(lines: List[OCRLine]) -> bool:
    """Checks whether the OCR detections contain enough coherent content to
    constitute a readable label, avoiding unnecessary fallback passes."""
    if not lines:
        return False
    total_chars = sum(len(line.text.strip()) for line in lines if line.confidence >= 0.2)
    return total_chars >= 6


def run_ocr(image_bgr: np.ndarray, languages: Optional[List[str]] = None) -> OCRResult:
    """Runs EasyOCR on a rectified label image and returns structured line output.

    Uses an adaptive multilingual approach:
    - If languages are explicitly passed, uses that language reader directly.
    - Otherwise, runs the fast English reader (['en']) first.
    - If the English pass yields sufficient text, returns it immediately without
      running OCR twice.
    - If the English pass yields zero or negligible text, falls back to the
      multilingual (['en', 'hi']) reader to capture Indian-language packaging.
    """
    ocr_image, scale = downscale_image_for_ocr(image_bgr)

    def _execute_readtext(reader_instance: "easyocr.Reader") -> List[OCRLine]:
        detections = reader_instance.readtext(
            ocr_image,
            detail=1,
            paragraph=False,
            canvas_size=MAX_OCR_DIMENSION,
        )
        detected_lines: List[OCRLine] = []
        for polygon, text, confidence in detections:
            text = text.strip()
            if not text:
                continue
            x1, y1, x2, y2 = _polygon_to_bbox(polygon)

            if scale != 1.0:
                x1 = int(round(x1 / scale))
                y1 = int(round(y1 / scale))
                x2 = int(round(x2 / scale))
                y2 = int(round(y2 / scale))

                # Clamp coordinates to original image bounds
                height, width = image_bgr.shape[:2]
                x1 = max(0, min(width - 1, x1))
                y1 = max(0, min(height - 1, y1))
                x2 = max(0, min(width, x2))
                y2 = max(0, min(height, y2))

            detected_lines.append(OCRLine(
                text=text,
                x1=x1, y1=y1, x2=x2, y2=y2,
                confidence=round(float(confidence), 2),
            ))
        return detected_lines

    if languages is not None:
        reader = get_reader(languages)
        lines = _execute_readtext(reader)
    else:
        # Adaptive: try fast English first
        reader_en = get_reader(["en"])
        lines = _execute_readtext(reader_en)
        # Fall back to multilingual Hindi reader only if English pass found virtually nothing
        if not _is_meaningful_text(lines):
            reader_multi = get_reader(["en", "hi"])
            lines = _execute_readtext(reader_multi)

    # Sort top-to-bottom (then left-to-right on ties) so full_text reads
    # like the label, matching the ordering behaviour of the tesseract
    # version (which sorted by block/par/line position).
    lines.sort(key=lambda line: (line.y1, line.x1))

    full_text = "\n".join(line.text for line in lines)
    return OCRResult(lines=lines, full_text=full_text)
