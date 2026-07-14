"""Job payload contracts — the Python mirror of packages/queue/src/index.ts.

If a field changes there, it changes here. An automated JSON-Schema drift
check that fails CI on mismatch lands in M1; until then this header is the
contract: JOB_CONTRACT_VERSION must match the TypeScript side.
"""

from pydantic import BaseModel, Field

JOB_CONTRACT_VERSION = 1

# Queue names — must match QUEUES in packages/queue/src/index.ts verbatim.
QUEUE_PHOTO_PROCESS = "photo.process"
QUEUE_SELFIE_ENROLL = "selfie.enroll"
QUEUE_GALLERY_ZIP = "gallery.zip"
QUEUE_RETENTION_SWEEP = "retention.sweep"


class PhotoProcessJob(BaseModel):
    photoId: str = Field(min_length=36, max_length=36)
    eventId: str = Field(min_length=36, max_length=36)
    s3Key: str = Field(min_length=1)
    contentHash: str = Field(pattern=r"^[a-f0-9]{64}$")


class SelfieEnrollJob(BaseModel):
    participantId: str = Field(min_length=36, max_length=36)
    eventId: str = Field(min_length=36, max_length=36)
    s3Key: str = Field(min_length=1)


class GalleryZipJob(BaseModel):
    participantId: str = Field(min_length=36, max_length=36)
    photoIds: list[str] = Field(min_length=1, max_length=500)


class RetentionSweepJob(BaseModel):
    eventId: str = Field(min_length=36, max_length=36)
