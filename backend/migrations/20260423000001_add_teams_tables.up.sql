-- Teams: a group of employees within a company whose diagnostic results
-- are aggregated to understand team tendencies.
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT teams_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
    CONSTRAINT teams_description_length CHECK (description IS NULL OR char_length(description) <= 500)
);
CREATE INDEX idx_teams_company_id ON teams(company_id);

-- Team members: each member is linked to an auto-created users record
-- so that existing WV/CI diagnostic flows can be reused unchanged.
CREATE TABLE team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    invite_token TEXT NOT NULL UNIQUE,
    wv_status TEXT NOT NULL DEFAULT 'pending',
    ci_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT team_members_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
    CONSTRAINT team_members_email_length CHECK (email IS NULL OR char_length(email) <= 255),
    CONSTRAINT team_members_wv_status_check CHECK (wv_status IN ('pending', 'completed')),
    CONSTRAINT team_members_ci_status_check CHECK (ci_status IN ('pending', 'completed'))
);
CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_invite_token ON team_members(invite_token);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);
