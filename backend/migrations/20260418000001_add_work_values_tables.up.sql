-- Work Values diagnostic sessions.
CREATE TABLE wv_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress',
    initial_pairs JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT wv_sessions_status_check CHECK (status IN ('in_progress', 'completed', 'expired'))
);
CREATE INDEX idx_wv_sessions_user_id ON wv_sessions(user_id);

-- Work Values diagnostic results (one per completed session).
CREATE TABLE wv_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE REFERENCES wv_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    responses JSONB NOT NULL,
    mu JSONB NOT NULL,
    se JSONB NOT NULL,
    consistency_coefficient REAL,
    consistency_level TEXT,
    question_count SMALLINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT wv_results_question_count_range CHECK (question_count = 70),
    CONSTRAINT wv_results_consistency_level_check CHECK (
        consistency_level IS NULL OR consistency_level IN ('high', 'moderate', 'low', 'very_low', 'insufficient_data')
    )
);
CREATE INDEX idx_wv_results_user_id ON wv_results(user_id);
