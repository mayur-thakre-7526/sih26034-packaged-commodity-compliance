"""Pixel-to-millimetre calibration.

The font-size compliance check (Rule 8) needs real-world scale, which a
photo alone doesn't provide. This module implements the two reliable paths
described in the design discussion, and an explicit "none" result when
neither is available -- callers should treat "none" as meaning font-size
checks from this scan are indicative only, not a hard pass/fail.
"""

from typing import Optional

import cv2
import numpy as np

from image_processing.app.schemas import CalibrationResult


# A simple ArUco marker is a practical, cheap choice for the physical
# reference object: the inspector places a printed marker of known size next
# to the pack during capture, and the marker's real-world size is fixed and
# known in advance (e.g. a 30mm x 30mm printed square).
KNOWN_MARKER_SIZE_MM = 30.0


def calibrate_from_reference_object(image_bgr: np.ndarray) -> Optional[CalibrationResult]:
    """Attempts to detect a known ArUco marker in the frame and derive
    px-per-mm scale from its known physical size."""
    try:
        aruco_dict = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_4X4_50)
        detector_params = cv2.aruco.DetectorParameters()
        detector = cv2.aruco.ArucoDetector(aruco_dict, detector_params)
        corners, ids, _ = detector.detectMarkers(image_bgr)
    except AttributeError:
        # OpenCV build without the aruco contrib module -- calibration
        # simply isn't available via this path in this environment.
        return None

    if ids is None or len(corners) == 0:
        return None

    marker_corners = corners[0][0]  # 4x2 points of the first detected marker
    side_lengths = [
        np.linalg.norm(marker_corners[i] - marker_corners[(i + 1) % 4]) for i in range(4)
    ]
    avg_side_px = float(np.mean(side_lengths))
    if avg_side_px <= 0:
        return None

    px_per_mm = avg_side_px / KNOWN_MARKER_SIZE_MM
    return CalibrationResult(method="reference_object", px_per_mm=px_per_mm)


def calibrate_from_known_geometry(
    rectified_width_px: int,
    known_package_width_mm: Optional[float],
) -> Optional[CalibrationResult]:
    """When the product is matched to a master-data record (e.g. via barcode)
    with known physical dimensions, use the rectified image's pixel width
    against the known real-world width as the calibration scale.

    This assumes the rectification step (Stage 3) has already mapped the
    full package width into the rectified frame -- reasonable for the
    planar/homography case, less exact for cylindrical unwarps.
    """
    if not known_package_width_mm or known_package_width_mm <= 0:
        return None
    px_per_mm = rectified_width_px / known_package_width_mm
    return CalibrationResult(method="known_package_geometry", px_per_mm=px_per_mm)


def resolve_calibration(
    image_bgr: np.ndarray,
    reference_object_present: bool,
    known_package_width_mm: Optional[float],
) -> CalibrationResult:
    if reference_object_present:
        result = calibrate_from_reference_object(image_bgr)
        if result is not None:
            return result

    if known_package_width_mm:
        result = calibrate_from_known_geometry(image_bgr.shape[1], known_package_width_mm)
        if result is not None:
            return result

    return CalibrationResult(method="none", px_per_mm=None)
