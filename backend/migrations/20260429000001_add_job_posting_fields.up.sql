ALTER TABLE job_postings ADD COLUMN status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE job_postings ADD COLUMN job_category TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN hiring_count TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN appeal_points TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN challenges TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN team_description TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN skills_gained TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN tags TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE job_postings ADD COLUMN required_qualifications TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN preferred_qualifications TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN work_location TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN work_location_change_scope TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN job_description_change_scope TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN contract_type TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN probation_period TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN work_hours TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN break_time TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN holidays TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN salary_min INTEGER;
ALTER TABLE job_postings ADD COLUMN salary_max INTEGER;
ALTER TABLE job_postings ADD COLUMN salary_detail TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN insurance TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN remote_policy TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN benefits TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN smoking_policy TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN selection_process TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN cover_image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE job_postings ADD COLUMN highlight_title_role TEXT NOT NULL DEFAULT '仕事内容';
ALTER TABLE job_postings ADD COLUMN highlight_title_appeal TEXT NOT NULL DEFAULT 'この仕事の魅力';
ALTER TABLE job_postings ADD COLUMN highlight_title_challenge TEXT NOT NULL DEFAULT 'チャレンジ';
ALTER TABLE job_postings ADD COLUMN highlight_title_growth TEXT NOT NULL DEFAULT '身につくスキル';

-- Sync status from is_active for existing rows
UPDATE job_postings SET status = CASE WHEN is_active THEN 'open' ELSE 'draft' END;

-- Index for public listing
CREATE INDEX idx_job_postings_status ON job_postings(status, created_at DESC);
