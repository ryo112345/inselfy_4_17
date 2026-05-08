ALTER TABLE messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE messages ADD COLUMN metadata JSONB;
