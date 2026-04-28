ALTER TABLE company_accounts ADD COLUMN benefits_new JSONB NOT NULL DEFAULT '[]';

UPDATE company_accounts SET benefits_new = (
    SELECT COALESCE(jsonb_agg(trim(elem)), '[]'::jsonb)
    FROM unnest(string_to_array(benefits, E'\n')) AS elem
    WHERE trim(elem) != ''
) WHERE trim(benefits) != '';

ALTER TABLE company_accounts DROP COLUMN benefits;
ALTER TABLE company_accounts RENAME COLUMN benefits_new TO benefits;
