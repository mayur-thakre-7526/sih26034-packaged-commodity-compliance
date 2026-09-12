"""Request/response contracts for the Image Processing Service."""

from enum import Enum
from typing import List, Optional, Tuple

from pydantic import BaseModel, Field


class QualityFlag(str, Enum):
    CURVED_SURFACE = "curved_surface"
    PARTIAL_GLARE = "partial_glare"
    SEVERE_GLARE = "severe_glare"
    LOW_RESOLUTION = "low_resolution"
    BLURRY = "blurry"
    BOUNDARY_NOT_FOUND = "boundary_not_found"
    GEOMETRIC_CORRECTION_FAILED = "geometric_correction_failed"


class CalibrationResult(BaseModel):
    """Pixel-to-millimetre calibration info, passed through to the
    font-size analyzer downstream. method indicates how scale was derived."""
    method: str  # "reference_object" | "known_package_geometry" | "none"
    px_per_mm: Optional[float] = None
