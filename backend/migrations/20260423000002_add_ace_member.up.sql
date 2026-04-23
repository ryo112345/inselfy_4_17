ALTER TABLE team_members ADD COLUMN is_ace BOOLEAN NOT NULL DEFAULT FALSE;

-- Only one ace member per team
CREATE UNIQUE INDEX team_members_ace_unique ON team_members (team_id) WHERE is_ace = TRUE;
