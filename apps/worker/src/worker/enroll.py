"""Selfie enrollment (docs/design/03 §2): validate → embed → match → ready.

Runs on the priority queue — a human is staring at a spinner while this
executes. Failure modes are FEEDBACK, not errors: "no face found" goes
back to the attendee as a retake prompt via the enrollment status.
"""

import logging
import uuid

from . import db, settings, storage
from .matching import match_identity_against_event
from .pipeline import get_analyzer, load_image

import numpy as np

log = logging.getLogger("worker.enroll")


def _fail(conn, participant_id: str, reason: str) -> dict:
    conn.execute(
        """UPDATE event_participants
           SET enrollment_status = 'failed'::"EnrollmentStatus", enrollment_error = %s
           WHERE id = %s""",
        (reason, participant_id),
    )
    conn.commit()
    return {"status": "failed", "reason": reason}


def enroll_selfie(participant_id: str, event_id: str, s3_key: str) -> dict:
    analyzer = get_analyzer()
    img = load_image(storage.get_bytes(s3_key))
    bgr = np.asarray(img)[:, :, ::-1]
    faces = analyzer.get(bgr)

    # Selfie quality gate (docs/design/01 §3.3) — clear retake reasons.
    usable = [f for f in faces if float(f.det_score) >= settings.MIN_DET_SCORE]

    with db.connect() as conn:
        if len(usable) == 0:
            return _fail(conn, participant_id, "no_face")
        if len(usable) > 1:
            return _fail(conn, participant_id, "multiple_faces")

        face = usable[0]
        if face.normed_embedding is None:
            return _fail(conn, participant_id, "low_quality")

        embedding = [float(v) for v in face.normed_embedding]
        identity_id = str(uuid.uuid4())

        # Replace any previous enrollment (retakes): old identities off.
        conn.execute(
            "UPDATE face_identities SET active = false WHERE participant_id = %s",
            (participant_id,),
        )
        conn.execute(
            """
            INSERT INTO face_identities
                (id, participant_id, event_id, source, selfie_s3_key, embedding, active)
            VALUES (%s, %s, %s, 'selfie'::"IdentitySource", %s, %s::halfvec, true)
            """,
            (identity_id, participant_id, event_id, s3_key,
             "[" + ",".join(f"{v:.6f}" for v in embedding) + "]"),
        )

        matched = match_identity_against_event(
            conn, identity_id=identity_id, participant_id=participant_id,
            event_id=event_id, embedding=embedding,
        )

        conn.execute(
            """UPDATE event_participants
               SET enrollment_status = 'ready'::"EnrollmentStatus", enrollment_error = NULL
               WHERE id = %s""",
            (participant_id,),
        )
        conn.commit()

    log.info("participant %s enrolled — %d candidate matches", participant_id, matched)
    return {"status": "ready", "matches": matched}
