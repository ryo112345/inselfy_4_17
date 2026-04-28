ALTER TABLE company_accounts
    DROP COLUMN IF EXISTS headline,
    DROP COLUMN IF EXISTS representative_name,
    DROP COLUMN IF EXISTS capital,
    DROP COLUMN IF EXISTS revenue,
    DROP COLUMN IF EXISTS founded_month,
    DROP COLUMN IF EXISTS benefits,
    DROP COLUMN IF EXISTS average_age,
    DROP COLUMN IF EXISTS average_overtime_hours,
    DROP COLUMN IF EXISTS paid_leave_rate,
    DROP COLUMN IF EXISTS smoking_policy,
    DROP COLUMN IF EXISTS gallery_urls;
