"""Thin wrapper around PaddleOCR (via rapidocr-onnxruntime). Owns nothing about Legal Metrology
rules -- just turns a rectified label image into structured OCR output
(lines of text with bounding boxes and confidence). `extraction.py` is
what knows about MRP/net-quantity/etc. patterns.

Replaced EasyOCR with PaddleOCR (via rapidocr_onnxruntime to support modern python environments)
for higher accuracy on photographed packaging. Includes a multi-pass pipeline 
that tests original, upscaled, adaptive-thresholded, and CLAHE-enhanced variants,
selecting the objectively strongest result based on OCR confidence.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import cv2
import numpy as np
from rapidocr_onnxruntime import RapidOCR

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


# RapidOCR caches the onnx models intrinsically on instantiation.
_reader: Optional["RapidOCR"] = None

def get_reader() -> "RapidOCR":
    """Returns a cached RapidOCR (PaddleOCR) engine, constructing it on first use."""
    global _reader
    if _reader is None:
        # We enable use_angle_cls to detect and correct rotated text, 
        # which is extremely common in package photographs.
        _reader = RapidOCR(text_score=0.3)
    return _reader


def _polygon_to_bbox(polygon) -> Tuple[int, int, int, int]:
    """RapidOCR returns each detection's box as a 4-point polygon (not
    necessarily axis-aligned, since text can be slightly rotated even after
    rectification). Collapse it to an axis-aligned bounding box, matching
    the OCRLine contract the rest of the pipeline (and font-size
    measurement downstream) expects."""
    xs = [point[0] for point in polygon]
    ys = [point[1] for point in polygon]
    return int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))


def _generate_variants(image_bgr: np.ndarray) -> List[Tuple[str, np.ndarray]]:
    """Generate preprocessing variants for multi-pass OCR."""
    variants = []
    
    # Pass 1: Base image (might already be enhanced by the upstream pipeline)
    variants.append(("original", image_bgr))
    
    # Pass 2: Upscaled (helps PaddleOCR detect small MRP / net quantity text)
    h, w = image_bgr.shape[:2]
    upscaled = cv2.resize(image_bgr, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)
    variants.append(("upscaled_2x", upscaled))
    
    # Pass 3: Grayscale + CLAHE (helps with shadows, glare, colored backgrounds)
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    clahe_gray = clahe.apply(gray)
    clahe_bgr = cv2.cvtColor(clahe_gray, cv2.COLOR_GRAY2BGR)
    variants.append(("clahe", clahe_bgr))
    
    # Pass 4: Grayscale + Adaptive Thresholding (robust binarization for very low contrast text)
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 4)
    thresh_bgr = cv2.cvtColor(thresh, cv2.COLOR_GRAY2BGR)
    variants.append(("thresh", thresh_bgr))
    
    return variants


def run_ocr(image_bgr: np.ndarray, languages: Optional[List[str]] = None) -> OCRResult:
    """Runs PaddleOCR on a rectified label image using a multi-pass approach,
    and returns line/phrase-level output, sorted top-to-bottom.
    
    Uses multiple preprocessing variants and picks the objectively strongest
    result based on cumulative OCR confidence.
    """
    reader = get_reader()
    
    variants = _generate_variants(image_bgr)
    
    best_result = None
    best_score = -1.0
    
    for name, img in variants:
        # RapidOCR returns a tuple: (result, elapse)
        # result is None if no text is found.
        # result format: [[[[x1,y1], [x2,y2], [x3,y3], [x4,y4]], "Text", confidence], ...]
        detections, elapse = reader(img)
        
        if detections is None:
            continue
            
        score = 0.0
        lines: List[OCRLine] = []
        
        for item in detections:
            polygon, text, confidence = item
            text = text.strip()
            if not text:
                continue
                
            confidence = float(confidence)
            
            # Revert scaling for bounding boxes if we upscaled the image
            if name == "upscaled_2x":
                polygon = [[pt[0] / 2.0, pt[1] / 2.0] for pt in polygon]
                
            x1, y1, x2, y2 = _polygon_to_bbox(polygon)
            
            lines.append(OCRLine(
                text=text,
                x1=x1, y1=y1, x2=x2, y2=y2,
                confidence=round(confidence, 2)
            ))
            
            # Cumulative score to reward both high confidence and high text recall
            score += confidence
            
        if score > best_score:
            best_score = score
            
            # Sort top-to-bottom (then left-to-right on ties) so full_text reads like the label
            lines.sort(key=lambda line: (line.y1, line.x1))
            full_text = "\n".join(line.text for line in lines)
            best_result = OCRResult(lines=lines, full_text=full_text)
            
    if best_result is None:
        best_result = OCRResult(lines=[], full_text="")
        
    return best_result
