-- 求人（スカウト紐付け用の最小限）
CREATE TABLE job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_accounts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    employment_type TEXT NOT NULL DEFAULT '',
    location TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_job_postings_company ON job_postings(company_id, is_active);

-- クレジット管理
CREATE TABLE scout_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES company_accounts(id) ON DELETE CASCADE,
    balance INT NOT NULL DEFAULT 30,
    monthly_allowance INT NOT NULL DEFAULT 30,
    max_stock INT NOT NULL DEFAULT 120,
    last_replenished_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT scout_credits_balance_range CHECK (balance >= 0 AND balance <= max_stock)
);

-- クレジット出入り履歴
CREATE TABLE scout_credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_accounts(id) ON DELETE CASCADE,
    delta INT NOT NULL,
    reason TEXT NOT NULL,
    scout_message_id UUID,
    balance_after INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_scout_credit_ledger_company ON scout_credit_ledger(company_id, created_at DESC);

-- テンプレート
CREATE TABLE scout_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_scout_templates_company ON scout_templates(company_id);

-- スカウトメッセージのステータス
CREATE TYPE scout_message_status AS ENUM (
    'draft', 'sent', 'opened', 'replied', 'interested', 'declined', 'expired'
);

-- スカウトメッセージ
CREATE TABLE scout_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES company_accounts(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_posting_id UUID REFERENCES job_postings(id) ON DELETE SET NULL,
    template_id UUID REFERENCES scout_templates(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status scout_message_status NOT NULL DEFAULT 'draft',
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    resend_count SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_scout_messages_company ON scout_messages(company_id, status, created_at DESC);
CREATE INDEX idx_scout_messages_candidate ON scout_messages(candidate_id, status, created_at DESC);
CREATE INDEX idx_scout_messages_expires ON scout_messages(expires_at) WHERE status IN ('sent', 'opened');
CREATE UNIQUE INDEX idx_scout_messages_unique_active
    ON scout_messages(company_id, candidate_id)
    WHERE status NOT IN ('expired', 'declined');

-- 返信メッセージ
CREATE TABLE scout_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scout_message_id UUID NOT NULL REFERENCES scout_messages(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('candidate', 'company')),
    sender_id UUID NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_scout_replies_message ON scout_replies(scout_message_id, created_at);

-- 候補者のスカウト受付設定
CREATE TABLE user_scout_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    accepting_scouts BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 通知
CREATE TYPE notification_type AS ENUM (
    'scout_received', 'scout_replied', 'scout_interested',
    'scout_declined', 'scout_expired', 'credit_replenished', 'quality_warning'
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES company_accounts(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    reference_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT notifications_recipient CHECK (
        (user_id IS NOT NULL AND company_id IS NULL) OR
        (user_id IS NULL AND company_id IS NOT NULL)
    )
);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_notifications_company ON notifications(company_id, is_read, created_at DESC) WHERE company_id IS NOT NULL;
