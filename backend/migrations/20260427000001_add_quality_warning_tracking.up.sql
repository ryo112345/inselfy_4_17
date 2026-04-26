ALTER TABLE scout_credits
    ADD COLUMN warning_started_at TIMESTAMPTZ,
    ADD COLUMN quality_restricted BOOLEAN NOT NULL DEFAULT false;
