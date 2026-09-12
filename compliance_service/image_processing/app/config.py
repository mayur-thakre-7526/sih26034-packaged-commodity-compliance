"""Central configuration / tunable thresholds for the image processing pipeline.

Keeping these as named constants (rather than scattering magic numbers through
the pipeline modules) makes it easy to retune the service after a pilot without
touching business logic.
"""

import os


class Settings:
    # --- Input validation ---
    MIN_IMAGE_WIDTH_PX: int = 600
    MIN_IMAGE_HEIGHT_PX: int = 600
    BLUR_VARIANCE_THRESHOLD: float = 10.0  # Laplacian variance below this => blurry

    # --- Boundary detection ---
    MIN_CONTOUR_AREA_RATIO: float = 0.05  # contour must cover >=5% of frame to be "the package"
    CANNY_LOW: int = 50
    CANNY_HIGH: int = 150

    # --- Geometric correction ---
    RECTIFIED_WIDTH_PX: int = 1200
    RECTIFIED_HEIGHT_PX: int = 1200
    MAX_ASPECT_DISTORTION: float = 10.0  # sanity check on detected quadrilateral

    # --- Glare detection ---
    GLARE_VALUE_THRESHOLD: int = 245     # HSV "V" channel threshold for overexposure
    GLARE_SATURATION_MAX: int = 40       # near-white / low-saturation + high value = glare
    SEVERE_GLARE_AREA_RATIO: float = 0.08  # >8% of frame glared => severe

    # --- ROI / declaration detection ---
    ROI_MODEL_PATH: str = os.environ.get("ROI_MODEL_PATH", "models/declaration_detector.pt")
    ROI_CONFIDENCE_THRESHOLD: float = 0.35

    # --- Storage ---
    # Cloud storage has been dropped


settings = Settings()
