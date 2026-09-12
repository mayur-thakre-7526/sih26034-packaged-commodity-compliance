"""Stage 5 — Glare / reflection detection.

Rather than trying to inpaint over specular highlights (risky for a
legal-compliance document -- inpainting can fabricate text that was never
actually printed), we detect glared regions and:
  1. Tag the overall image with a quality flag if glare is significant.
  2. Return a binary glare mask so Stage 6 (ROI detection) can mark any
     declaration region that overlaps glare as low-confidence, prompting a
     human-review routing instead of an automatic pass/fail.
"""

from dataclasses import dataclass

import cv2
import numpy as np

from image_processing.app.config import settings


@dataclass
class GlareResult:
    mask: np.ndarray          # uint8, 255 where glare detected
    glare_area_ratio: float
    severe: bool


def detect_glare(image_bgr: np.ndarray) -> GlareResult:
    hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)

    # Glare = very bright (high V) AND low saturation (near-white/washed out),
    # which distinguishes it from e.g. a genuinely bright yellow package.
    bright_mask = v >= settings.GLARE_VALUE_THRESHOLD
    low_sat_mask = s <= settings.GLARE_SATURATION_MAX
    glare_mask = np.where(bright_mask & low_sat_mask, 255, 0).astype("uint8")

    # Clean up small speckle noise so single hot pixels don't count as glare.
    glare_mask = cv2.morphologyEx(glare_mask, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))

    area_ratio = float(np.count_nonzero(glare_mask)) / float(glare_mask.size)
    severe = area_ratio >= settings.SEVERE_GLARE_AREA_RATIO

    return GlareResult(mask=glare_mask, glare_area_ratio=area_ratio, severe=severe)


def bbox_overlaps_glare(bbox, glare_mask: np.ndarray, overlap_threshold: float = 0.15) -> bool:
    """Returns True if more than `overlap_threshold` fraction of the bbox
    area is covered by the glare mask."""
    x1, y1, x2, y2 = bbox
    x1, y1 = max(x1, 0), max(y1, 0)
    x2, y2 = min(x2, glare_mask.shape[1]), min(y2, glare_mask.shape[0])
    if x2 <= x1 or y2 <= y1:
        return False
    region = glare_mask[y1:y2, x1:x2]
    if region.size == 0:
        return False
    glare_fraction = float(np.count_nonzero(region)) / float(region.size)
    return glare_fraction >= overlap_threshold
