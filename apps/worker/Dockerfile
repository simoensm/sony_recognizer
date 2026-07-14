# AI worker image. CPU by default; the SAME image runs on a GPU box by
# installing the ml extra with onnxruntime-gpu instead (docs/design/03 §6).
FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml ./
COPY src ./src

# M0: skeleton deps only. M1: add ".[ml]" once the pipeline exists.
RUN pip install --no-cache-dir .

ENV PYTHONUNBUFFERED=1
CMD ["python", "-m", "worker.main"]
