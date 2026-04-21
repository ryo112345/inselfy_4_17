CREATE TABLE integrated_report_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic1 SMALLINT NOT NULL CHECK (topic1 BETWEEN 1 AND 10),
    topic2 SMALLINT NOT NULL CHECK (topic2 BETWEEN 1 AND 10),
    topic3 SMALLINT NOT NULL CHECK (topic3 BETWEEN 1 AND 10),
    free_text TEXT NOT NULL DEFAULT '' CHECK (char_length(free_text) <= 200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT topics_distinct CHECK (topic1 != topic2 AND topic1 != topic3 AND topic2 != topic3)
);
CREATE INDEX idx_integrated_report_requests_user_id ON integrated_report_requests(user_id);

CREATE TABLE integrated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL UNIQUE REFERENCES integrated_report_requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    viewed_at TIMESTAMPTZ
);
CREATE INDEX idx_integrated_reports_user_id ON integrated_reports(user_id);
CREATE INDEX idx_integrated_reports_request_id ON integrated_reports(request_id);
