# AI worker image (build from apps/worker):
#   docker build -t sr-worker apps/worker
# CPU by default. The SAME image runs on a GPU box by installing
# onnxruntime-gpu and setting ONNX_PROVIDER=CUDAExecutionProvider
# (docs/design/03 §6).
FROM python:3.11-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libglib2.0-0 libgl1 libxcb1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY pyproject.toml ./
COPY src ./src
RUN pip install --no-cache-dir ".[ml]"

# Face models (~300 MB) download here on first start; mount a volume
# so restarts don't re-download.
VOLUME /root/.insightface

ENV PYTHONUNBUFFERED=1
CMD ["python", "-m", "worker.main"]
