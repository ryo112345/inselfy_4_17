package article

import "time"

type AuthorType string

const (
	AuthorTypeUser    AuthorType = "user"
	AuthorTypeCompany AuthorType = "company"
)

type Status string

const (
	StatusDraft     Status = "draft"
	StatusPublished Status = "published"
)

type Article struct {
	ID              string
	AuthorType      AuthorType
	AuthorUserID    *string
	AuthorCompanyID *string
	Title           string
	Body            string
	Status          Status
	IsPaid          bool
	PriceYen        int
	StripePriceID   *string
	CoverImageURL   *string
	Tags            []string
	CreatedAt       time.Time
	UpdatedAt       time.Time
	PublishedAt     *time.Time
}

type ArticleWithAuthor struct {
	Article        Article
	AuthorName     string
	AuthorUsername *string
}

type CreateArticleInput struct {
	AuthorType      AuthorType
	AuthorUserID    *string
	AuthorCompanyID *string
	Title           string
	Body            string
	IsPaid          bool
	PriceYen        int
	CoverImageURL   *string
	Tags            []string
}

type UpdateArticleInput struct {
	Title         string
	Body          string
	IsPaid        bool
	PriceYen      int
	CoverImageURL *string
	Tags          []string
}

type Purchase struct {
	ID                    string
	ArticleID             string
	BuyerUserID           string
	StripeSessionID       string
	StripePaymentIntentID *string
	AmountYen             int
	Status                string
	CreatedAt             time.Time
	CompletedAt           *time.Time
}
