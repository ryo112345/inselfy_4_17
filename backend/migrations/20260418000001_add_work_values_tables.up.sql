-- Work Values diagnostic sessions.
CREATE TABLE work_values_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress',
    initial_pairs JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT work_values_sessions_status_check CHECK (status IN ('in_progress', 'completed', 'expired'))
);
CREATE INDEX idx_work_values_sessions_user_id ON work_values_sessions(user_id);

-- Work Needs scores (21 needs per completed session).
CREATE TABLE work_needs_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE REFERENCES work_values_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    responses JSONB NOT NULL,
    mu JSONB NOT NULL,
    se JSONB NOT NULL,
    consistency_coefficient REAL,
    consistency_level TEXT,
    question_count SMALLINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT work_needs_scores_question_count_range CHECK (question_count = 70),
    CONSTRAINT work_needs_scores_consistency_level_check CHECK (
        consistency_level IS NULL OR consistency_level IN ('high', 'moderate', 'low', 'very_low', 'insufficient_data')
    )
);
CREATE INDEX idx_work_needs_scores_user_id ON work_needs_scores(user_id);

-- Work Values scores (6 aggregated values per completed session).
CREATE TABLE work_values_scores (
    session_id UUID NOT NULL REFERENCES work_values_sessions(id) ON DELETE CASCADE,
    value_id TEXT NOT NULL,
    mu REAL NOT NULL,
    display_score REAL NOT NULL,
    rank SMALLINT NOT NULL,
    PRIMARY KEY (session_id, value_id),
    CONSTRAINT work_values_scores_value_id_check CHECK (
        value_id IN ('achievement', 'comfort', 'status', 'altruism', 'safety', 'autonomy')
    ),
    CONSTRAINT work_values_scores_rank_range CHECK (rank BETWEEN 1 AND 6)
);
