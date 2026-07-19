CREATE TYPE resume_upload_status AS ENUM ('pending', 'reviewing', 'approved', 'rejected');

CREATE TABLE resume_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_filename TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    status resume_upload_status NOT NULL DEFAULT 'pending',
    draft JSONB,
    approved_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT resume_uploads_original_filename_length CHECK (char_length(original_filename) BETWEEN 1 AND 255)
);

CREATE INDEX idx_resume_uploads_status ON resume_uploads(status);
CREATE INDEX idx_resume_uploads_user_id ON resume_uploads(user_id);

-- 処理中（pending/reviewing）のアップロードは1ユーザー1件まで
CREATE UNIQUE INDEX uq_resume_uploads_active_per_user
    ON resume_uploads(user_id) WHERE status IN ('pending', 'reviewing');
