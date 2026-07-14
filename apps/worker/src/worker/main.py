"""AI worker entrypoint (docs/design/03 §5).

Consumes photo.process jobs: fetch image → detect faces → embed → persist
→ generate variants. selfie.enroll gets a separate consumer so a waiting
human is never stuck behind background photos; its real matching logic
lands in M2.

Failure model: an exception marks the photo `failed` and re-raises, so
BullMQ retries with backoff (3 attempts, then the job stays visible as
failed = our dead-letter queue). Everything inside is idempotent.
"""

import asyncio
import logging
import os
import signal

from bullmq import Worker

from . import db
from .contracts import (
    QUEUE_PHOTO_PROCESS,
    QUEUE_SELFIE_ENROLL,
    PhotoProcessJob,
    SelfieEnrollJob,
)
from .pipeline import process_photo

logging.basicConfig(level=logging.INFO, format="[%(name)s] %(message)s")
log = logging.getLogger("worker")

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")


async def handle_photo(job, job_token):
    payload = PhotoProcessJob.model_validate(job.data)
    try:
        # The pipeline is CPU-bound sync code; run it off the event loop
        # so heartbeats to Redis keep flowing during long photos.
        return await asyncio.to_thread(
            process_photo, payload.photoId, payload.eventId, payload.s3Key
        )
    except Exception:
        log.exception("photo %s failed", payload.photoId)
        try:
            with db.connect() as conn:
                db.mark_photo(conn, payload.photoId, "failed")
                conn.commit()
        except Exception:
            log.exception("could not mark photo %s as failed", payload.photoId)
        raise  # let BullMQ schedule the retry


async def handle_selfie(job, job_token):
    payload = SelfieEnrollJob.model_validate(job.data)
    log.info("selfie.enroll received for participant %s (matching lands in M2)", payload.participantId)
    return {"skeleton": True}


async def main() -> None:
    log.info("starting — redis=%s", REDIS_URL)
    photo_worker = Worker(QUEUE_PHOTO_PROCESS, handle_photo, {"connection": REDIS_URL})
    selfie_worker = Worker(QUEUE_SELFIE_ENROLL, handle_selfie, {"connection": REDIS_URL})
    log.info("consuming %s and %s", QUEUE_PHOTO_PROCESS, QUEUE_SELFIE_ENROLL)

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set)

    await stop.wait()
    log.info("shutting down…")
    await photo_worker.close()
    await selfie_worker.close()


if __name__ == "__main__":
    asyncio.run(main())
