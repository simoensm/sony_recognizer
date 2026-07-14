"""Object storage access (MinIO in dev, S3-compatible in prod)."""

import boto3
from botocore.config import Config

from . import settings

_s3 = boto3.client(
    "s3",
    endpoint_url=settings.S3_ENDPOINT,
    region_name=settings.S3_REGION,
    aws_access_key_id=settings.S3_ACCESS_KEY,
    aws_secret_access_key=settings.S3_SECRET_KEY,
    config=Config(s3={"addressing_style": "path"}),  # required by MinIO
)


def get_bytes(key: str) -> bytes:
    resp = _s3.get_object(Bucket=settings.S3_BUCKET, Key=key)
    return resp["Body"].read()


def put_bytes(key: str, data: bytes, content_type: str) -> None:
    _s3.put_object(Bucket=settings.S3_BUCKET, Key=key, Body=data, ContentType=content_type)
