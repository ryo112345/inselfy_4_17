CREATE TYPE article_status AS ENUM ('draft', 'published');
CREATE TYPE author_type AS ENUM ('user', 'company');

CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_type author_type NOT NULL,
    author_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    author_company_id UUID REFERENCES company_accounts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    status article_status NOT NULL DEFAULT 'draft',
    is_paid BOOLEAN NOT NULL DEFAULT false,
    price_yen INTEGER NOT NULL DEFAULT 0,
    stripe_price_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    CONSTRAINT articles_title_length CHECK (char_length(title) BETWEEN 1 AND 200),
    CONSTRAINT articles_body_length CHECK (char_length(body) <= 100000),
    CONSTRAINT articles_price_range CHECK (price_yen >= 0 AND price_yen <= 1000000),
    CONSTRAINT articles_author_check CHECK (
        (author_type = 'user' AND author_user_id IS NOT NULL AND author_company_id IS NULL) OR
        (author_type = 'company' AND author_company_id IS NOT NULL AND author_user_id IS NULL)
    ),
    CONSTRAINT articles_paid_price CHECK (
        (is_paid = false AND price_yen = 0) OR
        (is_paid = true AND price_yen > 0)
    )
);

CREATE INDEX idx_articles_author_user ON articles(author_user_id) WHERE author_user_id IS NOT NULL;
CREATE INDEX idx_articles_author_company ON articles(author_company_id) WHERE author_company_id IS NOT NULL;
CREATE INDEX idx_articles_published_at ON articles(published_at DESC) WHERE status = 'published';

CREATE TABLE article_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    buyer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stripe_session_id TEXT NOT NULL UNIQUE,
    stripe_payment_intent_id TEXT,
    amount_yen INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT article_purchases_amount_positive CHECK (amount_yen > 0),
    CONSTRAINT article_purchases_status_values CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))
);

CREATE INDEX idx_article_purchases_article ON article_purchases(article_id);
CREATE INDEX idx_article_purchases_buyer ON article_purchases(buyer_user_id);
CREATE UNIQUE INDEX idx_article_purchases_unique_buy ON article_purchases(article_id, buyer_user_id) WHERE status = 'completed';
