ALTER TABLE assets
  ADD COLUMN description TEXT NOT NULL DEFAULT '',
  ADD COLUMN "authorization" TEXT NOT NULL DEFAULT 'INTERNAL';

CREATE INDEX assets_authorization_created_at_idx ON assets("authorization", created_at DESC);
