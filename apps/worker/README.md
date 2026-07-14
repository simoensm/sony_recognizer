# AI Worker

Python service that consumes jobs from Redis and (from M1) runs the face
pipeline: detect → align → embed → match. Design: `docs/design/03-ai-pipeline.md`.

## Run locally

```bash
cd apps/worker
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"        # add ".[ml]" in M1 for the real pipeline
REDIS_URL=redis://localhost:6379 python -m worker.main
```

The worker and the TypeScript services share job shapes via
`packages/queue` (TS) ↔ `src/worker/contracts.py` (Python). Keep them in sync.
