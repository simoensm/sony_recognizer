"""Worker configuration from environment variables.

Loads the repo-root .env in development so `python -m worker.main`
just works; in Docker/production, real env vars take precedence.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# repo_root/.env — three levels up from this file's package
_repo_root = Path(__file__).resolve().parents[3].parent
load_dotenv(_repo_root / ".env", override=False)

REDIS_URL = os.environ["REDIS_URL"]
DATABASE_URL = os.environ["DATABASE_URL"]
S3_ENDPOINT = os.environ["S3_ENDPOINT"]
S3_REGION = os.environ.get("S3_REGION", "us-east-1")
S3_ACCESS_KEY = os.environ["S3_ACCESS_KEY"]
S3_SECRET_KEY = os.environ["S3_SECRET_KEY"]
S3_BUCKET = os.environ["S3_BUCKET"]

# --- Pipeline knobs (docs/design/03) ---
# ONNX execution provider: CPUExecutionProvider locally,
# CUDAExecutionProvider on a GPU box — same code (docs/design/03 §6).
ONNX_PROVIDER = os.environ.get("ONNX_PROVIDER", "CPUExecutionProvider")
# Detector input size: bigger finds smaller faces in crowds, costs CPU.
DET_SIZE = int(os.environ.get("DET_SIZE", "1024"))
# Faces below this detection confidence are ignored entirely.
MIN_DET_SCORE = float(os.environ.get("MIN_DET_SCORE", "0.55"))
# Faces smaller than this (pixels, shorter bbox side) embed too poorly to use.
MIN_FACE_SIZE = int(os.environ.get("MIN_FACE_SIZE", "24"))

THUMB_MAX_PX = 400
PREVIEW_MAX_PX = 1600
