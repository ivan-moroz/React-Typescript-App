ALTER TABLE assets
  ALTER COLUMN data DROP NOT NULL,
  ADD COLUMN storage_mode TEXT NOT NULL DEFAULT 'INLINE';

CREATE TABLE asset_chunks (
  id SERIAL PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  data BYTEA NOT NULL,
  CONSTRAINT asset_chunks_asset_id_position_key UNIQUE (asset_id, position)
);
