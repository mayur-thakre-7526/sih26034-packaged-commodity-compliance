"""FastAPI entrypoint for the Image Processing Service.

Exposes:
  POST /v1/image-processing/process  — main pipeline endpoint (by image_url,
                                        matching the async, storage-backed
                                        flow used in production)
  POST /v1/image-processing/process-upload — convenience endpoint accepting
                                        a direct file upload, useful for local
                                        testing / Postman without a real
                                        object store in front of it
  GET  /healthz                      — liveness/readiness probe
"""

import logging

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from image_processing.app.pipeline import boundary_detection, calibration, enhancement, geometric_correction
from image_processing.app.pipeline import glare_detection, validation
from image_processing.app.pipeline.orchestrator import ProcessingFailedError, process_image
from image_processing.app.schemas import ProcessImageRequest, ProcessImageResponse
from image_processing.app.storage import upload_rectified_image

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("image_processing_service")

app = FastAPI(
    title="Legal Metrology Compliance — Image Processing Service",
    description="Rectifies packaging images and localizes declaration regions "
                "ahead of OCR/text extraction.",
    version="1.0.0",
)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


@app.post("/v1/image-processing/process", response_model=ProcessImageResponse)
def process(request: ProcessImageRequest):
    try:
        return process_image(request)
    except ProcessingFailedError as exc:
        logger.warning("Processing failed for scan %s: %s", request.scan_id, exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception:
        logger.exception("Unexpected error processing scan %s", request.scan_id)
        raise HTTPException(status_code=500, detail="Internal processing error")


@app.post("/v1/image-processing/process-upload")
async def process_upload(scan_id: str, file: UploadFile = File(...)):
    """Dev/testing convenience endpoint: runs the same six stages directly on
    an uploaded file, bypassing the object-storage round trip used by the
    `/process` endpoint. Not intended for production traffic."""
    raw_bytes = await file.read()

    try:
        validation_result = validation.decode_and_validate(raw_bytes)
    except validation.InvalidImageError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    image = validation_result.image_bgr
    flags = list(validation_result.flags)

    boundary = boundary_detection.detect_boundary(image)
    correction_result = geometric_correction.correct_geometry(image, boundary)
    image = correction_result.image_bgr
    flags.extend(correction_result.flags)

    image = enhancement.enhance(image)

    glare_result = glare_detection.detect_glare(image)


    calib = calibration.resolve_calibration(image, False, None)
    rectified_url = upload_rectified_image(scan_id, image)

    return JSONResponse(
        {
            "scan_id": scan_id,
            "rectified_image_url": rectified_url,
            "quality_flags": [f.value for f in dict.fromkeys(flags)],

            "calibration": calib.model_dump(),
        }
    )
