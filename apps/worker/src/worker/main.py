"""AI worker entrypoint (docs/design/03 §5).

M0: consumes both queues and logs validated payloads — proves the
TS-produces / Python-consumes pipeline works before any ML exists.

M1 replaces `handle_photo` with the real pipeline:
    fetch from S3 → SCRFD detect → quality filter → align → ArcFace embed
    → persist faces (idempotent upsert) → match both directions
    → write thumb/preview variants → mark photo processed

Design rules already honored here:
  - selfie.enroll is a separate consumer: a waiting human always beats
    a background photo (priority, docs/design/03 §5)
  - jobs are validated before processing: a malformed payload fails loudly
  - one process = one future ONNX session; scale via replicas, not threads
"""

import asyncio
import os
import signal

from bullmq import Worker

from .contracts import (
    QUEUE_PHOTO_PROCESS,
    QUEUE_SELFIE_ENROLL,
    PhotoProcessJob,
    SelfieEnrollJob,
)

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")


async def handle_photo(job, job_token):
    payload = PhotoProcessJob.model_validate(job.data)
    print(f"[worker] photo.process received: photo={payload.photoId} (ML lands in M1)")
    return {"faces": 0, "skeleton": True}


async def handle_selfie(job, job_token):
    payload = SelfieEnrollJob.model_validate(job.data)
    print(f"[worker] selfie.enroll received: participant={payload.participantId}")
    return {"skeleton": True}


async def main() -> None:
    print(f"[worker] starting — redis={REDIS_URL}")
    photo_worker = Worker(QUEUE_PHOTO_PROCESS, handle_photo, {"connection": REDIS_URL})
    selfie_worker = Worker(QUEUE_SELFIE_ENROLL, handle_selfie, {"connection": REDIS_URL})

    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set)

    await stop.wait()
    print("[worker] shutting down…")
    await photo_worker.close()
    await selfie_worker.close()


if __name__ == "__main__":
    asyncio.run(main())
