"""Stage 2 — Package boundary detection.

Finds the outline of the package in the frame so later stages know what to
rectify. Two shapes are distinguished:

  - "planar": a roughly four-sided outline (box, pouch, carton) -> suitable
     for a perspective (homography) correction.
  - "cylindrical": a roughly elliptical outline (bottle, jar, can) -> suitable
     for cylindrical unwarping, which is a much harder, approximate correction.

This uses classical CV (Canny edges + contours) rather than a learned
segmentation model, which is adequate when captures are reasonably
uncluttered (single product, plain background). If the deployment context
has cluttered shelf backgrounds, swap this for a fine-tuned segmentation
model (e.g. U-Net) behind the same function signature.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional

import cv2
import numpy as np

from image_processing.app.config import settings


class PackageShape(str, Enum):
    PLANAR = "planar"
    CYLINDRICAL = "cylindrical"
    UNKNOWN = "unknown"


@dataclass
class BoundaryResult:
    shape: PackageShape
    quadrilateral: Optional[np.ndarray] = None  # 4x2 points, for PLANAR
    ellipse: Optional[tuple] = None             # (center, axes, angle), for CYLINDRICAL
    found: bool = False


def _largest_valid_contour(contours, frame_area: float):
    candidates = [c for c in contours if cv2.contourArea(c) >= settings.MIN_CONTOUR_AREA_RATIO * frame_area]
    if not candidates:
        return None
    return max(candidates, key=cv2.contourArea)


def _order_quad_points(pts: np.ndarray) -> np.ndarray:
    """Orders 4 points as top-left, top-right, bottom-right, bottom-left,
    which is the order warpPerspective's destination rectangle expects."""
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]   # top-left has smallest sum
    rect[2] = pts[np.argmax(s)]   # bottom-right has largest sum
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # top-right has smallest (y-x)
    rect[3] = pts[np.argmax(diff)]  # bottom-left has largest (y-x)
    return rect


def detect_boundary(image_bgr: np.ndarray) -> BoundaryResult:
    height, width = image_bgr.shape[:2]
    frame_area = float(height * width)

    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blurred, settings.CANNY_LOW, settings.CANNY_HIGH)
    edges = cv2.dilate(edges, np.ones((3, 3), np.uint8), iterations=2)

    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    main_contour = _largest_valid_contour(contours, frame_area)

    if main_contour is None:
        return BoundaryResult(shape=PackageShape.UNKNOWN, found=False)

    perimeter = cv2.arcLength(main_contour, True)
    approx = cv2.approxPolyDP(main_contour, 0.08 * perimeter, True)

    if len(approx) == 4:
        quad = _order_quad_points(approx.reshape(4, 2).astype("float32"))
        # Sanity check: reject absurd aspect ratios (likely a mis-detection,
        # e.g. picking up a shelf edge rather than the package itself).
        (tl, tr, br, bl) = quad
        width_top = np.linalg.norm(tr - tl)
        width_bottom = np.linalg.norm(br - bl)
        height_left = np.linalg.norm(bl - tl)
        height_right = np.linalg.norm(br - tr)
        avg_w = max((width_top + width_bottom) / 2, 1.0)
        avg_h = max((height_left + height_right) / 2, 1.0)
        aspect = max(avg_w, avg_h) / min(avg_w, avg_h)
        if aspect <= settings.MAX_ASPECT_DISTORTION:
            return BoundaryResult(shape=PackageShape.PLANAR, quadrilateral=quad, found=True)

    # Not a clean quadrilateral -> try fitting an ellipse (bottle/jar/can case).
    if len(main_contour) >= 5:
        ellipse = cv2.fitEllipse(main_contour)
        return BoundaryResult(shape=PackageShape.CYLINDRICAL, ellipse=ellipse, found=True)

    return BoundaryResult(shape=PackageShape.UNKNOWN, found=False)
