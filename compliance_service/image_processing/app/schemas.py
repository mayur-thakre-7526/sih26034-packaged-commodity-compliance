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



class ProcessImageRequest(BaseModel):
    scan_id: str
    image_url: str
    # Optional hints supplied by the capture app / product master data,
    # used to improve font-size calibration downstream.
    reference_object_present: bool = False
    known_package_width_mm: Optional[float] = None
    known_package_height_mm: Optional[float] = None


class ProcessImageResponse(BaseModel):
    scan_id: str
    rectified_image_url: str
    quality_flags: List[QualityFlag] = []
    calibration: Optional["CalibrationResult"] = None
    processing_ms: float


class CalibrationResult(BaseModel):
    """Pixel-to-millimetre calibration info, passed through to the
    font-size analyzer downstream. method indicates how scale was derived."""
    method: str  # "reference_object" | "known_package_geometry" | "none"
    px_per_mm: Optional[float] = None


ProcessImageResponse.model_rebuild()
