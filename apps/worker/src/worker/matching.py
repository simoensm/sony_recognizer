"""Face matching — both directions, one index (docs/design/03 §3).

Cosine similarity on normalized embeddings; pgvector's <=> operator
returns cosine DISTANCE (1 - similarity), so:
    similarity ≥ 0.55  →  distance ≤ 0.45   → auto-match
    similarity ≥ 0.42  →  distance ≤ 0.58   → "Is this you?" band
Initial thresholds from docs/design/03 §3 — tuned per event type later.
"""

import uuid

import psycopg

AUTO_SIM = 0.55
PENDING_SIM = 0.42


def _vec(embedding: list[float]) -> str:
    return "[" + ",".join(f"{v:.6f}" for v in embedding) + "]"


def _status_for(similarity: float) -> str | None:
    if similarity >= AUTO_SIM:
        return "auto"
    if similarity >= PENDING_SIM:
        return "pending_confirmation"
    return None


def _insert_match(
    conn: psycopg.Connection,
    *,
    face_id: str,
    identity_id: str,
    photo_id: str,
    participant_id: str,
    event_id: str,
    similarity: float,
) -> None:
    status = _status_for(similarity)
    if status is None:
        return
    conn.execute(
        """
        INSERT INTO matches (
            id, face_id, identity_id, photo_id, participant_id, event_id,
            score, status, created_at, updated_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s::"MatchStatus", now(), now())
        ON CONFLICT (face_id, identity_id) DO NOTHING
        """,
        (str(uuid.uuid4()), face_id, identity_id, photo_id, participant_id, event_id,
         similarity, status),
    )


def match_identity_against_event(
    conn: psycopg.Connection, *, identity_id: str, participant_id: str,
    event_id: str, embedding: list[float],
) -> int:
    """Direction 1 — new selfie vs all existing event faces (docs/design/03 §3).
    One ANN query over the event's face index."""
    rows = conn.execute(
        """
        SELECT f.id, f.photo_id, 1 - (f.embedding <=> %s::halfvec) AS similarity
        FROM faces f
        JOIN photos p ON p.id = f.photo_id
        WHERE f.event_id = %s
          AND f.embedding IS NOT NULL
          AND f.quality_score > 0
          AND p.published AND p.deleted_at IS NULL AND p.status = 'processed'
          AND (f.embedding <=> %s::halfvec) <= %s
        ORDER BY f.embedding <=> %s::halfvec
        LIMIT 2000
        """,
        (_vec(embedding), event_id, _vec(embedding), 1 - PENDING_SIM, _vec(embedding)),
    ).fetchall()

    matched = 0
    for face_id, photo_id, similarity in rows:
        _insert_match(
            conn, face_id=face_id, identity_id=identity_id, photo_id=photo_id,
            participant_id=participant_id, event_id=event_id, similarity=float(similarity),
        )
        matched += 1
    return matched


def match_face_against_identities(
    conn: psycopg.Connection, *, face_id: str, photo_id: str,
    event_id: str, embedding: list[float],
) -> int:
    """Direction 2 — new photo face vs enrolled identities (docs/design/03 §3).
    The identity set is small (hundreds), so this is trivially fast — it's
    what makes galleries grow LIVE while the photographer keeps shooting."""
    rows = conn.execute(
        """
        SELECT fi.id, fi.participant_id, 1 - (fi.embedding <=> %s::halfvec) AS similarity
        FROM face_identities fi
        JOIN event_participants ep ON ep.id = fi.participant_id
        WHERE fi.event_id = %s
          AND fi.active
          AND fi.embedding IS NOT NULL
          AND ep.status = 'active'
          AND (fi.embedding <=> %s::halfvec) <= %s
        """,
        (_vec(embedding), event_id, _vec(embedding), 1 - PENDING_SIM),
    ).fetchall()

    matched = 0
    for identity_id, participant_id, similarity in rows:
        _insert_match(
            conn, face_id=face_id, identity_id=identity_id, photo_id=photo_id,
            participant_id=participant_id, event_id=event_id, similarity=float(similarity),
        )
        matched += 1
    return matched
