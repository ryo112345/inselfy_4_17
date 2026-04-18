-- Career Interest diagnostic sessions.
CREATE TABLE career_interest_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress',
    items JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT career_interest_sessions_status_check CHECK (status IN ('in_progress', 'completed', 'expired'))
);
CREATE INDEX idx_career_interest_sessions_user_id ON career_interest_sessions(user_id);

-- Career Interest item-level responses (60 items per completed session).
CREATE TABLE career_interest_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE REFERENCES career_interest_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    responses JSONB NOT NULL,
    question_count SMALLINT NOT NULL,
    differentiation_sd REAL,
    differentiation_level TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT career_interest_results_question_count_check CHECK (question_count = 60),
    CONSTRAINT career_interest_results_diff_level_check CHECK (
        differentiation_level IS NULL OR differentiation_level IN ('high', 'moderate', 'low')
    )
);
CREATE INDEX idx_career_interest_results_user_id ON career_interest_results(user_id);

-- Basic Interest scores (20 per completed session).
CREATE TABLE career_interest_basic_scores (
    session_id UUID NOT NULL REFERENCES career_interest_sessions(id) ON DELETE CASCADE,
    basic_interest_id TEXT NOT NULL,
    score REAL NOT NULL,
    rank SMALLINT NOT NULL,
    PRIMARY KEY (session_id, basic_interest_id),
    CONSTRAINT career_interest_basic_scores_rank_range CHECK (rank BETWEEN 1 AND 20)
);

-- RIASEC type scores (6 per completed session).
CREATE TABLE career_interest_type_scores (
    session_id UUID NOT NULL REFERENCES career_interest_sessions(id) ON DELETE CASCADE,
    type_id TEXT NOT NULL,
    score REAL NOT NULL,
    rank SMALLINT NOT NULL,
    PRIMARY KEY (session_id, type_id),
    CONSTRAINT career_interest_type_scores_type_check CHECK (
        type_id IN ('R', 'I', 'A', 'S', 'E', 'C')
    ),
    CONSTRAINT career_interest_type_scores_rank_range CHECK (rank BETWEEN 1 AND 6)
);
