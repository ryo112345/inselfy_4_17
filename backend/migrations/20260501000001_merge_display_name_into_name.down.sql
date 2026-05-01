ALTER TABLE users ADD COLUMN display_name TEXT;
ALTER TABLE users ADD CONSTRAINT users_display_name_length CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 100);
