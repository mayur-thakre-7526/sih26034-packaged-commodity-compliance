"""Thin object-storage wrapper.

Kept separate from the pipeline so the pipeline modules stay pure
image-in/image-out functions that are easy to unit test without touching
S3/MinIO. Swap the implementation here without touching pipeline code.
"""

import io
import uuid

import cv2
import numpy as np
import requests

from image_processing.app.config import settings

try:
    import boto3

    _s3_client = boto3.client("s3", endpoint_url=settings.OBJECT_STORE_ENDPOINT)
except ImportError:
    _s3_client = None  # boto3 optional for local dev without real storage


def download_image(image_url: str) -> bytes:
    """Fetches the raw uploaded image. In production this reads from the
    object store via a signed URL; for local/dev use it also accepts plain
    http(s) URLs directly."""
    response = requests.get(image_url, timeout=15)
    response.raise_for_status()
    return response.content


def upload_rectified_image(scan_id: str, image_bgr: np.ndarray) -> str:
    """Uploads the processed image and returns its retrievable URL."""
    success, encoded = cv2.imencode(".jpg", image_bgr, [cv2.IMWRITE_JPEG_QUALITY, 92])
    if not success:
        raise RuntimeError("Failed to encode rectified image as JPEG")

    key = f"rectified/{scan_id}/{uuid.uuid4().hex}.jpg"

    if _s3_client is None:
        # Local/dev fallback: write to disk and return a file:// style path
        # so the rest of the pipeline can be exercised without S3/MinIO.
        local_path = f"/tmp/{uuid.uuid4().hex}_{scan_id}.jpg"
        with open(local_path, "wb") as f:
            f.write(encoded.tobytes())
        return f"file://{local_path}"

    _s3_client.upload_fileobj(
        io.BytesIO(encoded.tobytes()), settings.OBJECT_STORE_BUCKET, key
    )
    return f"s3://{settings.OBJECT_STORE_BUCKET}/{key}"
