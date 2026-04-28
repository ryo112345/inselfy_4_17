ALTER TABLE company_accounts
    ALTER COLUMN benefits TYPE TEXT USING '',
    ALTER COLUMN benefits SET DEFAULT '';
