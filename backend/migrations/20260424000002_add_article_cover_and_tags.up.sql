ALTER TABLE articles ADD COLUMN cover_image_url TEXT;
ALTER TABLE articles ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';
