"""Stage 4 — Enhancement.

Applies contrast normalization and denoising tuned to preserve text edges
(bilateral filter rather than Gaussian blur, which would soften the very
edges OCR depends on), followed by a mild unsharp-mask pass.
"""

import cv2
import numpy as np


def _apply_clahe(image_bgr: np.ndarray) -> np.ndarray:
    """CLAHE (Contrast Limited Adaptive Histogram Equalization) applied on the
    L channel of LAB color space, so we boost local contrast without
    distorting color balance (useful for reading colored declaration text
    against colored packaging backgrounds)."""
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l_channel)
    merged = cv2.merge((l_enhanced, a_channel, b_channel))
    return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)


def _connect_dot_matrix(image_bgr: np.ndarray) -> np.ndarray:
    kernel = np.ones((2,2), np.uint8)
    # Erode the bright background (which dilates the dark text strokes)
    return cv2.erode(image_bgr, kernel, iterations=1)


def _denoise(image_bgr: np.ndarray) -> np.ndarray:
    """Bilateral filter smooths flat regions (packaging background) while
    keeping sharp edges (text strokes) largely intact -- unlike a Gaussian
    blur, which would soften both equally."""
    return cv2.bilateralFilter(image_bgr, d=5, sigmaColor=25, sigmaSpace=25)


def _unsharp_mask(image_bgr: np.ndarray, amount: float = 0.6) -> np.ndarray:
    blurred = cv2.GaussianBlur(image_bgr, (0, 0), sigmaX=2)
    sharpened = cv2.addWeighted(image_bgr, 1 + amount, blurred, -amount, 0)
    return sharpened


def enhance(image_bgr: np.ndarray) -> np.ndarray:
    stage1 = _apply_clahe(image_bgr)
    stage2 = _denoise(stage1)
    stage3 = _unsharp_mask(stage2)
    return stage3
