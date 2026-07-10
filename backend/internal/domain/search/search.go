// Package search defines read models for the cross-content search feature.
package search

import "time"

// UserHit is a user matched by keyword search.
type UserHit struct {
	ID           string
	Username     string
	Name         string
	Headline     *string
	AvatarURL    *string
	ProfileColor *string
}

// ArticleHit is a published article matched by keyword search.
type ArticleHit struct {
	ID          string
	Title       string
	Excerpt     string
	AuthorName  string
	Tags        []string
	IsPaid      bool
	PublishedAt time.Time
}

// PostHit is a timeline post matched by keyword search.
type PostHit struct {
	ID        string
	UserID    string
	Username  string
	Name      string
	Content   string
	CreatedAt time.Time
}

// JobHit is an open job posting matched by keyword search.
type JobHit struct {
	ID             string
	Title          string
	CompanyName    *string
	CompanyLogoURL *string
	EmploymentType string
	Location       *string
	CreatedAt      time.Time
}

// Page holds one category's hits with the total match count.
type Page[T any] struct {
	Items []T
	Total int
}

// Result aggregates every category for the blended "all" search.
type Result struct {
	Users    Page[UserHit]
	Articles Page[ArticleHit]
	Posts    Page[PostHit]
	Jobs     Page[JobHit]
}
