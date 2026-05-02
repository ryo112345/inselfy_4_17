ALTER TABLE users
    DROP COLUMN IF EXISTS followers_count,
    DROP COLUMN IF EXISTS following_count;

DROP TABLE IF EXISTS follows;
