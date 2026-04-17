DROP TABLE IF EXISTS user_skills;
DROP TABLE IF EXISTS skills;
DROP TABLE IF EXISTS educations;
DROP TABLE IF EXISTS experiences;

ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_display_name_length,
    DROP CONSTRAINT IF EXISTS users_headline_length,
    DROP CONSTRAINT IF EXISTS users_location_length,
    DROP CONSTRAINT IF EXISTS users_about_length,
    DROP CONSTRAINT IF EXISTS users_industry_length,
    DROP CONSTRAINT IF EXISTS users_job_type_length,
    DROP CONSTRAINT IF EXISTS users_job_seeking_status_length,
    DROP CONSTRAINT IF EXISTS users_profile_color_format,
    DROP COLUMN IF EXISTS is_public,
    DROP COLUMN IF EXISTS profile_color,
    DROP COLUMN IF EXISTS job_seeking_status,
    DROP COLUMN IF EXISTS job_type,
    DROP COLUMN IF EXISTS industry,
    DROP COLUMN IF EXISTS about,
    DROP COLUMN IF EXISTS location,
    DROP COLUMN IF EXISTS headline,
    DROP COLUMN IF EXISTS display_name;
