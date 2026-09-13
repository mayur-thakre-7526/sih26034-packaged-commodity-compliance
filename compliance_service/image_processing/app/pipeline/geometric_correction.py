"""Stage 3 — Geometric correction.

Given the boundary detected in Stage 2, produce a front-on, rectified view:

  - PLANAR   -> homography (perspective) transform to a straight rectangle.
  - CYLINDRICAL -> approximate cylindrical unwarp. This is inherently
    approximate (we don't know the true radius/camera distance from a single
    monocular image), so we treat it as best-effort and always tag the
    output with QualityFlag.CURVED_SURFACE so downstream OCR/detection models
    (trained to tolerate residual curvature) can apply their fallback path,
    and so a human reviewer sees the caveat if it's surfaced in a report.
  - UNKNOWN  -> cannot correct; pass the original image through untouched
    and flag it, rather than silently guessing.
"""

from dataclasses import dataclass, field
from typing import List, Optional

import cv2
import numpy as np

from image_processing.app.config import settings
from image_processing.app.pipeline.boundary_detection import BoundaryResult, PackageShape
from image_processing.app.schemas import QualityFlag


@dataclass
class CorrectionResult:
    image_bgr: np.ndarray
    flags: List[QualityFlag] = field(default_factory=list)
    corrected: bool = False


def _perspective_correct(image_bgr: np.ndarray, quad: np.ndarray) -> np.ndarray:
    dst_w, dst_h = settings.RECTIFIED_WIDTH_PX, settings.RECTIFIED_HEIGHT_PX
    dst_pts = np.array(
        [[0, 0], [dst_w - 1, 0], [dst_w - 1, dst_h - 1], [0, dst_h - 1]],
        dtype="float32",
    )
    matrix = cv2.getPerspectiveTransform(quad, dst_pts)
    return cv2.warpPerspective(image_bgr, matrix, (dst_w, dst_h))


def _cylindrical_unwarp(image_bgr: np.ndarray, ellipse) -> Optional[np.ndarray]:
    """Approximate cylindrical-to-planar unwarp.

    We treat the fitted ellipse's horizontal extent as the visible arc of the
    cylinder and remap columns using an arcsine spacing so that text near the
    left/right edges (which is more foreshortened on a curved surface) is
    stretched back out. This is a heuristic approximation, not a physically
    exact unwarp -- true correction would need camera calibration or a known
    package radius, which usually isn't available at inspection time.
    """
    (cx, cy), (major_axis, minor_axis), angle = ellipse
    radius_px = major_axis / 2.0
    if radius_px < 10:
        return None  # too small / degenerate fit, not worth unwarping

    height, width = image_bgr.shape[:2]
    out_w, out_h = settings.RECTIFIED_WIDTH_PX, settings.RECTIFIED_HEIGHT_PX

    # Build a remap: output column j maps back to an input column that is
    # spaced according to the arc, not linearly -- this is what "unwraps" the
    # compression of text near the visible edges of the cylinder.
    map_x = np.zeros((out_h, out_w), dtype=np.float32)
    map_y = np.zeros((out_h, out_w), dtype=np.float32)

    half_arc = np.pi / 3.0  # assume ~120 degrees of the surface is visible/legible
    x0 = max(cx - radius_px, 0)
    x1 = min(cx + radius_px, width - 1)
    if x1 <= x0:
        return None

    for j in range(out_w):
        theta = -half_arc + (2 * half_arc) * (j / max(out_w - 1, 1))
        src_x = cx + radius_px * np.sin(theta)
        src_x = np.clip(src_x, 0, width - 1)
        map_x[:, j] = src_x

    for i in range(out_h):
        src_y = (i / max(out_h - 1, 1)) * (height - 1)
        map_y[i, :] = src_y

    unwarped = cv2.remap(image_bgr, map_x, map_y, interpolation=cv2.INTER_LINEAR)
    return unwarped


def correct_geometry(image_bgr: np.ndarray, boundary: BoundaryResult) -> CorrectionResult:
    if boundary.shape == PackageShape.PLANAR and boundary.quadrilateral is not None:
        try:
            corrected = _perspective_correct(image_bgr, boundary.quadrilateral)
            return CorrectionResult(image_bgr=corrected, corrected=True)
        except cv2.error:
            return CorrectionResult(
                image_bgr=image_bgr,
                flags=[QualityFlag.GEOMETRIC_CORRECTION_FAILED],
                corrected=False,
            )

    if boundary.shape == PackageShape.CYLINDRICAL and boundary.ellipse is not None:
        (cx, cy), (d1, d2), angle = boundary.ellipse
        height, width = image_bgr.shape[:2]
        radius_px = max(d1, d2) / 2.0
        # Conservative guardrail: cylindrical unwarping is only applied when the ellipse
        # is well-formed, well within frame bounds, and has a plausible physical radius.
        # If classification is uncertain or fit is abnormal, preserve the original image
        # untouched rather than applying destructive warping.
        is_safe = (
            radius_px >= 30
            and radius_px <= width * 1.2
            and min(d1, d2) >= 20
            and (-0.2 * width <= cx <= 1.2 * width)
            and (-0.2 * height <= cy <= 1.2 * height)
        )
        if is_safe:
            unwarped = _cylindrical_unwarp(image_bgr, boundary.ellipse)
            if unwarped is not None:
                return CorrectionResult(
                    image_bgr=unwarped,
                    flags=[QualityFlag.CURVED_SURFACE],
                    corrected=True,
                )
        return CorrectionResult(
            image_bgr=image_bgr,
            flags=[QualityFlag.CURVED_SURFACE],
            corrected=False,
        )

    # Boundary not found at all -> pass through untouched.
    return CorrectionResult(
        image_bgr=image_bgr,
        flags=[QualityFlag.BOUNDARY_NOT_FOUND],
        corrected=False,
    )
