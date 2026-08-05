ALTER TABLE users
ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

WITH numbered_users AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 AS new_position
  FROM users
)
UPDATE users
SET position = numbered_users.new_position
FROM numbered_users
WHERE users.id = numbered_users.id;
