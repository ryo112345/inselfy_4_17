CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES company_accounts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'applied',
    message TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT job_applications_status_check CHECK (
        status IN ('applied', 'screening', 'interview', 'offer', 'accepted', 'rejected', 'withdrawn')
    ),
    CONSTRAINT job_applications_unique UNIQUE (job_posting_id, candidate_id)
);

CREATE INDEX idx_job_applications_company ON job_applications(company_id, created_at DESC);
CREATE INDEX idx_job_applications_candidate ON job_applications(candidate_id, created_at DESC);
CREATE INDEX idx_job_applications_job ON job_applications(job_posting_id, status);
