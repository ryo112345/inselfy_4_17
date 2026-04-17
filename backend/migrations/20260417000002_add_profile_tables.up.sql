-- Extend users with profile fields.
ALTER TABLE users
    ADD COLUMN display_name TEXT,
    ADD COLUMN headline TEXT,
    ADD COLUMN location TEXT,
    ADD COLUMN about TEXT,
    ADD COLUMN industry TEXT,
    ADD COLUMN job_type TEXT,
    ADD COLUMN job_seeking_status TEXT,
    ADD COLUMN profile_color TEXT,
    ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true,
    ADD CONSTRAINT users_display_name_length CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 100),
    ADD CONSTRAINT users_headline_length CHECK (headline IS NULL OR char_length(headline) <= 255),
    ADD CONSTRAINT users_location_length CHECK (location IS NULL OR char_length(location) <= 100),
    ADD CONSTRAINT users_about_length CHECK (about IS NULL OR char_length(about) <= 2000),
    ADD CONSTRAINT users_industry_length CHECK (industry IS NULL OR char_length(industry) <= 100),
    ADD CONSTRAINT users_job_type_length CHECK (job_type IS NULL OR char_length(job_type) <= 50),
    ADD CONSTRAINT users_job_seeking_status_length CHECK (job_seeking_status IS NULL OR char_length(job_seeking_status) <= 50),
    ADD CONSTRAINT users_profile_color_format CHECK (profile_color IS NULL OR profile_color ~ '^#[0-9A-Fa-f]{6}$');

-- Experiences: up to 50 per user enforced at application layer.
CREATE TABLE experiences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    title TEXT NOT NULL,
    start_year SMALLINT NOT NULL,
    start_month SMALLINT NOT NULL,
    end_year SMALLINT,
    end_month SMALLINT,
    is_current BOOLEAN NOT NULL DEFAULT false,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT experiences_company_name_length CHECK (char_length(company_name) BETWEEN 1 AND 200),
    CONSTRAINT experiences_title_length CHECK (char_length(title) BETWEEN 1 AND 200),
    CONSTRAINT experiences_start_year_range CHECK (start_year BETWEEN 1950 AND 2100),
    CONSTRAINT experiences_start_month_range CHECK (start_month BETWEEN 1 AND 12),
    CONSTRAINT experiences_end_year_range CHECK (end_year IS NULL OR end_year BETWEEN 1950 AND 2100),
    CONSTRAINT experiences_end_month_range CHECK (end_month IS NULL OR end_month BETWEEN 1 AND 12),
    CONSTRAINT experiences_current_period CHECK (
        (is_current = TRUE AND end_year IS NULL AND end_month IS NULL) OR
        (is_current = FALSE AND end_year IS NOT NULL AND end_month IS NOT NULL)
    ),
    CONSTRAINT experiences_end_after_start CHECK (
        end_year IS NULL OR end_month IS NULL OR
        (end_year > start_year) OR
        (end_year = start_year AND end_month >= start_month)
    ),
    CONSTRAINT experiences_description_length CHECK (char_length(description) <= 5000)
);
CREATE INDEX idx_experiences_user_id ON experiences(user_id);

-- Educations: up to 20 per user enforced at application layer.
CREATE TABLE educations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    school TEXT NOT NULL,
    degree TEXT,
    start_year SMALLINT,
    end_year SMALLINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT educations_school_length CHECK (char_length(school) BETWEEN 1 AND 200),
    CONSTRAINT educations_degree_length CHECK (degree IS NULL OR char_length(degree) <= 200),
    CONSTRAINT educations_start_year_range CHECK (start_year IS NULL OR start_year BETWEEN 1950 AND 2100),
    CONSTRAINT educations_end_year_range CHECK (end_year IS NULL OR end_year BETWEEN 1950 AND 2100),
    CONSTRAINT educations_end_after_start CHECK (
        end_year IS NULL OR start_year IS NULL OR end_year >= start_year
    )
);
CREATE INDEX idx_educations_user_id ON educations(user_id);

-- Skills: global master list, unique name.
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT skills_name_length CHECK (char_length(name) BETWEEN 1 AND 100)
);

-- user_skills: join table; up to 50 per user enforced at application layer.
CREATE TABLE user_skills (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, skill_id)
);
CREATE INDEX idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX idx_user_skills_skill_id ON user_skills(skill_id);
