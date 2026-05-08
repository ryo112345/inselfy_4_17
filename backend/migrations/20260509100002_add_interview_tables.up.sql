CREATE TABLE interview_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id),
    company_id UUID NOT NULL REFERENCES company_accounts(id),
    candidate_id UUID NOT NULL REFERENCES users(id),
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    message_id UUID,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interview_proposals_application ON interview_proposals(application_id);
CREATE INDEX idx_interview_proposals_status ON interview_proposals(status);
CREATE INDEX idx_interview_proposals_candidate ON interview_proposals(candidate_id);

CREATE TABLE interview_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proposal_id UUID NOT NULL REFERENCES interview_proposals(id),
    application_id UUID NOT NULL REFERENCES job_applications(id),
    proposed_by UUID NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'proposed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interview_slots_proposal ON interview_slots(proposal_id);
CREATE INDEX idx_interview_slots_application ON interview_slots(application_id);
CREATE INDEX idx_interview_slots_start_time ON interview_slots(start_time);

CREATE TABLE interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id),
    company_id UUID NOT NULL REFERENCES company_accounts(id),
    candidate_id UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL DEFAULT '面接',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT,
    meeting_url TEXT,
    internal_notes TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled',
    selected_slot_id UUID REFERENCES interview_slots(id),
    proposal_id UUID REFERENCES interview_proposals(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interviews_company ON interviews(company_id);
CREATE INDEX idx_interviews_candidate ON interviews(candidate_id);
CREATE INDEX idx_interviews_application ON interviews(application_id);
CREATE INDEX idx_interviews_start_time ON interviews(start_time);
CREATE INDEX idx_interviews_status ON interviews(status);
