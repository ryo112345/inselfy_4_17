UPDATE users SET name = display_name WHERE display_name IS NOT NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_display_name_length;
ALTER TABLE users DROP COLUMN IF EXISTS display_name;
