-- HNSW indexes for fast approximate-nearest-neighbor face search
-- (docs/design/03 §4). Written by hand because Prisma cannot express
-- indexes on pgvector columns. Cosine distance on fp16 vectors.
--
-- m / ef_construction are pgvector defaults — revisit after the M4
-- load test with real event data.

CREATE INDEX IF NOT EXISTS faces_embedding_hnsw
  ON faces USING hnsw (embedding halfvec_cosine_ops);

CREATE INDEX IF NOT EXISTS face_identities_embedding_hnsw
  ON face_identities USING hnsw (embedding halfvec_cosine_ops);
