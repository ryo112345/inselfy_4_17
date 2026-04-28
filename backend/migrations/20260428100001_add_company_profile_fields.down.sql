ALTER TABLE company_accounts
    DROP COLUMN IF EXISTS description,
    DROP COLUMN IF EXISTS industry,
    DROP COLUMN IF EXISTS location,
    DROP COLUMN IF EXISTS employee_count,
    DROP COLUMN IF EXISTS founded_year,
    DROP COLUMN IF EXISTS website_url,
    DROP COLUMN IF EXISTS logo_url,
    DROP COLUMN IF EXISTS cover_image_url;
