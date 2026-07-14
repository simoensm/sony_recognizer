"""The face pipeline (docs/design/03 §1.3):

    image → detect all faces → filter by confidence/size → embed each face
          → persist → generate thumb/preview variants

Model: InsightFace "buffalo_l" bundle (SCRFD detector + ArcFace-family
recognizer) via ONNX Runtime. Downloaded automatically on first run
(~300 MB, one time). ⚠ buffalo_l weights are licensed for NON-commercial
use — fine for development; commercially-licensed weights are a launch
gate (docs/design/03 §1.2) and drop in via the same interface.
"""

import hashlib
import io
import logging

import numpy as np
from PIL import Image, ImageOps

from . import db, settings, storage

log = logging.getLogger("worker.pipeline")

_analyzer = None


def get_analyzer():
    """Load the models once per process (docs/design/03 §5). Lazy so the
    worker can boot and report queue connectivity before the first job."""
    global _analyzer
    if _analyzer is None:
        from insightface.app import FaceAnalysis

        log.info("loading face models (first run downloads ~300 MB)…")
        _analyzer = FaceAnalysis(
            name="buffalo_l",
            allowed_modules=["detection", "recognition"],
            providers=[settings.ONNX_PROVIDER],
        )
        _analyzer.prepare(ctx_id=0, det_size=(settings.DET_SIZE, settings.DET_SIZE))
        log.info("face models ready (provider=%s)", settings.ONNX_PROVIDER)
    return _analyzer


def load_image(data: bytes) -> Image.Image:
    """Decode + apply EXIF rotation (cameras store orientation as metadata;
    ignoring it means detecting faces in sideways images)."""
    img = Image.open(io.BytesIO(data))
    img = ImageOps.exif_transpose(img)
    return img.convert("RGB")


def make_variants(img: Image.Image, photo_id: str, s3_prefix: str) -> None:
    """Small webp copies: `thumb` for grids, `preview` for the lightbox.
    Originals are only served on explicit download (docs/design/06 §4)."""
    for name, max_px in (("thumb", settings.THUMB_MAX_PX), ("preview", settings.PREVIEW_MAX_PX)):
        copy = img.copy()
        copy.thumbnail((max_px, max_px))
        buf = io.BytesIO()
        copy.save(buf, format="WEBP", quality=80)
        storage.put_bytes(f"{s3_prefix}/variants/{photo_id}/{name}.webp", buf.getvalue(), "image/webp")


def process_photo(photo_id: str, event_id: str, s3_key: str) -> dict:
    """Runs inside a photo.process job. Idempotent — safe to retry."""
    analyzer = get_analyzer()

    data = storage.get_bytes(s3_key)
    img = load_image(data)
    width, height = img.size

    # PIL gives RGB; InsightFace expects BGR (OpenCV convention).
    bgr = np.asarray(img)[:, :, ::-1]

    detected = analyzer.get(bgr)
    kept = 0

    with db.connect() as conn:
        db.mark_photo(conn, photo_id, "processing")
        db.set_photo_dimensions(conn, photo_id, width, height)

        for face in detected:
            x1, y1, x2, y2 = (int(v) for v in face.bbox)
            # Clamp to image bounds; detector can overshoot at edges.
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(width, x2), min(height, y2)
            w, h = x2 - x1, y2 - y1

            det_score = float(face.det_score)
            usable = det_score >= settings.MIN_DET_SCORE and min(w, h) >= settings.MIN_FACE_SIZE

            # bbox_hash makes retries idempotent: same face box → same row.
            bbox_hash = hashlib.sha1(f"{x1},{y1},{w},{h}".encode()).hexdigest()[:16]

            embedding = None
            if usable and face.normed_embedding is not None:
                embedding = [float(v) for v in face.normed_embedding]

            db.insert_face(
                conn,
                photo_id=photo_id,
                event_id=event_id,
                bbox=(x1, y1, w, h),
                bbox_hash=bbox_hash,
                detection_score=det_score,
                # M1: detection confidence doubles as quality score.
                # A dedicated blur/pose/occlusion score lands with matching (M2).
                quality_score=det_score if usable else 0.0,
                landmarks={"kps": face.kps.tolist() if face.kps is not None else None},
                embedding=embedding,
            )
            if usable:
                kept += 1

        # Variants before flipping status: "processed" must mean "gallery-ready".
        s3_prefix = s3_key.rsplit("/originals/", 1)[0]
        make_variants(img, photo_id, s3_prefix)

        db.mark_photo(conn, photo_id, "processed")
        conn.commit()

    log.info("photo %s: %d faces detected, %d usable", photo_id, len(detected), kept)
    return {"detected": len(detected), "usable": kept}
