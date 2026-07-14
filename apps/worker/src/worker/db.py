"""Postgres access for the worker — raw SQL via psycopg.

The TypeScript side owns the schema (Prisma migrations); the worker only
INSERTs faces and UPDATEs photo status. Embeddings go in as text cast to
::halfvec — no special driver support needed.
"""

import json
import uuid

import psycopg

from . import settings


def connect() -> psycopg.Connection:
    return psycopg.connect(settings.DATABASE_URL)


def mark_photo(conn: psycopg.Connection, photo_id: str, status: str) -> None:
    conn.execute("UPDATE photos SET status = %s WHERE id = %s", (status, photo_id))


def set_photo_dimensions(conn: psycopg.Connection, photo_id: str, width: int, height: int) -> None:
    conn.execute(
        "UPDATE photos SET width = %s, height = %s WHERE id = %s", (width, height, photo_id)
    )


def insert_face(
    conn: psycopg.Connection,
    *,
    photo_id: str,
    event_id: str,
    bbox: tuple[int, int, int, int],
    bbox_hash: str,
    detection_score: float,
    quality_score: float,
    landmarks: dict,
    embedding: list[float] | None,
) -> str:
    """Idempotent: retried jobs hit ON CONFLICT and keep the same row
    (docs/design/03 §5). Returns the face id either way — matching needs it."""
    emb_text = "[" + ",".join(f"{v:.6f}" for v in embedding) + "]" if embedding else None
    row = conn.execute(
        """
        INSERT INTO faces (
            id, photo_id, event_id,
            bbox_x, bbox_y, bbox_w, bbox_h, bbox_hash,
            detection_score, quality_score, landmarks, embedding
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::halfvec)
        ON CONFLICT (photo_id, bbox_hash)
        DO UPDATE SET detection_score = EXCLUDED.detection_score
        RETURNING id
        """,
        (
            str(uuid.uuid4()),
            photo_id,
            event_id,
            bbox[0],
            bbox[1],
            bbox[2],
            bbox[3],
            bbox_hash,
            detection_score,
            quality_score,
            json.dumps(landmarks),
            emb_text,
        ),
    ).fetchone()
    return str(row[0])
