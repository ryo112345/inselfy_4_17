CREATE TABLE ci_ai_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL UNIQUE REFERENCES career_interest_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ci_ai_reports_user_id ON ci_ai_reports(user_id);
CREATE INDEX idx_ci_ai_reports_session_id ON ci_ai_reports(session_id);
