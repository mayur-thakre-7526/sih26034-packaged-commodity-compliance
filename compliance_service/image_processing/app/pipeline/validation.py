"""Stage 1 — Input validation & normalization.

Decodes the raw upload, fixes EXIF orientation (a very common bug with phone
photos coming in sideways/upside-down), and rejects images that are too small
or too blurry to be worth running through the rest of the pipeline.
"""

from dataclasses import dataclass, field
from typing import List

import cv2
import numpy as np
from PIL import Image, ImageOps
import io

from image_processing.app.config import settings
from image_processing.app.schemas import QualityFlag


class InvalidImageError(Exception):
    """Raised when the image cannot be processed at all (corrupt, unreadable)."""


@dataclass
class ValidationResult:
    image_bgr: np.ndarray
    flags: List[QualityFlag] = field(default_factory=list)


def _fix_exif_orientation(pil_image: Image.Image) -> Image.Image:
    """Applies the EXIF orientation tag so the image is displayed right-side-up.
    Phone cameras store orientation as metadata rather than rotating pixels."""
    try:
        return ImageOps.exif_transpose(pil_image)
    except Exception:
        # If EXIF data is missing/corrupt, fall back to the image as-is
        # rather than failing the whole request.
        return pil_image


def _laplacian_variance(gray: np.ndarray) -> float:
    """A standard, cheap blur metric: the variance of the Laplacian.
    Sharp images have high-frequency edges -> high variance;
    blurry images look smooth -> low variance."""
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def decode_and_validate(raw_bytes: bytes) -> ValidationResult:
    """Entry point for Stage 1.

    Raises InvalidImageError for unrecoverable problems (can't decode at all).
    Recoverable quality issues (low-res, blurry) are returned as flags so the
    caller can decide whether to hard-reject or pass through with a warning.
    """
    try:
        pil_image = Image.open(io.BytesIO(raw_bytes))
        pil_image = _fix_exif_orientation(pil_image)
        pil_image = pil_image.convert("RGB")
    except Exception as exc:
        raise InvalidImageError(f"Could not decode image: {exc}") from exc

    # PIL is RGB; the rest of the pipeline (OpenCV) works in BGR.
    rgb = np.array(pil_image)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

    flags: List[QualityFlag] = []

    height, width = bgr.shape[:2]
    if width < settings.MIN_IMAGE_WIDTH_PX or height < settings.MIN_IMAGE_HEIGHT_PX:
        flags.append(QualityFlag.LOW_RESOLUTION)

    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    if _laplacian_variance(gray) < settings.BLUR_VARIANCE_THRESHOLD:
        flags.append(QualityFlag.BLURRY)

    return ValidationResult(image_bgr=bgr, flags=flags)
