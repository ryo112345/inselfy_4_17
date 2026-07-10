package sqlc

import (
	"context"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/domain/search"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type SearchQueryService struct {
	pool *pgxpool.Pool
}

var _ port.SearchQueryService = (*SearchQueryService)(nil)

func NewSearchQueryService(pool *pgxpool.Pool) *SearchQueryService {
	return &SearchQueryService{pool: pool}
}

// likePattern escapes ILIKE wildcards so user input matches literally.
// pgx sends the pattern as a bind parameter; ILIKE's default escape is `\`.
func likePattern(q string) string {
	r := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return "%" + r.Replace(q) + "%"
}

const searchUsersWhere = `
FROM users u
WHERE u.is_public = true
  AND (u.username ILIKE $1 OR u.name ILIKE $1 OR u.headline ILIKE $1
       OR EXISTS (
         SELECT 1 FROM user_skills us
         JOIN skills s ON s.id = us.skill_id
         WHERE us.user_id = u.id AND s.name ILIKE $1
       ))`

func (s *SearchQueryService) SearchUsers(ctx context.Context, q string, limit, offset int) ([]search.UserHit, int, error) {
	pattern := likePattern(q)
	rows, err := s.pool.Query(ctx,
		`SELECT u.id, u.username, u.name, u.headline, u.avatar_url, u.profile_color`+
			searchUsersWhere+`
ORDER BY u.created_at DESC
LIMIT $2 OFFSET $3`,
		pattern, limit, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	hits := []search.UserHit{}
	for rows.Next() {
		var id pgtype.UUID
		var username, name string
		var headline, avatarURL, profileColor pgtype.Text
		if err := rows.Scan(&id, &username, &name, &headline, &avatarURL, &profileColor); err != nil {
			return nil, 0, err
		}
		hits = append(hits, search.UserHit{
			ID:           uuidToString(id),
			Username:     username,
			Name:         name,
			Headline:     textPtr(headline),
			AvatarURL:    textPtr(avatarURL),
			ProfileColor: textPtr(profileColor),
		})
	}

	var total int
	if err := s.pool.QueryRow(ctx, `SELECT COUNT(*)`+searchUsersWhere, pattern).Scan(&total); err != nil {
		return nil, 0, err
	}
	return hits, total, nil
}

const searchArticlesWhere = `
FROM articles a
LEFT JOIN users u ON u.id = a.author_user_id
LEFT JOIN company_accounts ca ON ca.id = a.author_company_id
WHERE a.status = 'published'
  AND (a.title ILIKE $1 OR a.body ILIKE $1
       OR EXISTS (SELECT 1 FROM unnest(a.tags) tag WHERE tag ILIKE $1))`

func (s *SearchQueryService) SearchArticles(ctx context.Context, q string, limit, offset int) ([]search.ArticleHit, int, error) {
	pattern := likePattern(q)
	rows, err := s.pool.Query(ctx,
		`SELECT a.id, a.title, LEFT(a.body, 200),
       COALESCE(CASE WHEN a.author_type = 'user' THEN u.name ELSE ca.company_name END, ''),
       a.tags, a.is_paid, a.published_at`+
			searchArticlesWhere+`
ORDER BY a.published_at DESC
LIMIT $2 OFFSET $3`,
		pattern, limit, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	hits := []search.ArticleHit{}
	for rows.Next() {
		var id pgtype.UUID
		var title, excerpt, authorName string
		var tags []string
		var isPaid bool
		var publishedAt pgtype.Timestamptz
		if err := rows.Scan(&id, &title, &excerpt, &authorName, &tags, &isPaid, &publishedAt); err != nil {
			return nil, 0, err
		}
		hits = append(hits, search.ArticleHit{
			ID:          uuidToString(id),
			Title:       title,
			Excerpt:     excerpt,
			AuthorName:  authorName,
			Tags:        tags,
			IsPaid:      isPaid,
			PublishedAt: publishedAt.Time,
		})
	}

	var total int
	if err := s.pool.QueryRow(ctx, `SELECT COUNT(*)`+searchArticlesWhere, pattern).Scan(&total); err != nil {
		return nil, 0, err
	}
	return hits, total, nil
}

const searchPostsWhere = `
FROM posts p
JOIN users u ON u.id = p.user_id
WHERE p.content ILIKE $1`

func (s *SearchQueryService) SearchPosts(ctx context.Context, q string, limit, offset int) ([]search.PostHit, int, error) {
	pattern := likePattern(q)
	rows, err := s.pool.Query(ctx,
		`SELECT p.id, p.user_id, u.username, u.name, p.content, p.created_at`+
			searchPostsWhere+`
ORDER BY p.created_at DESC
LIMIT $2 OFFSET $3`,
		pattern, limit, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	hits := []search.PostHit{}
	for rows.Next() {
		var id, userID pgtype.UUID
		var username, name, content string
		var createdAt pgtype.Timestamptz
		if err := rows.Scan(&id, &userID, &username, &name, &content, &createdAt); err != nil {
			return nil, 0, err
		}
		hits = append(hits, search.PostHit{
			ID:        uuidToString(id),
			UserID:    uuidToString(userID),
			Username:  username,
			Name:      name,
			Content:   content,
			CreatedAt: createdAt.Time,
		})
	}

	var total int
	if err := s.pool.QueryRow(ctx, `SELECT COUNT(*)`+searchPostsWhere, pattern).Scan(&total); err != nil {
		return nil, 0, err
	}
	return hits, total, nil
}

const searchJobsWhere = `
FROM job_postings jp
JOIN company_accounts ca ON ca.id = jp.company_id
WHERE jp.status = 'open'
  AND (jp.title ILIKE $1 OR jp.description ILIKE $1)`

func (s *SearchQueryService) SearchJobs(ctx context.Context, q string, limit, offset int) ([]search.JobHit, int, error) {
	pattern := likePattern(q)
	rows, err := s.pool.Query(ctx,
		`SELECT jp.id, jp.title, ca.company_name, ca.logo_url, jp.employment_type, jp.location, jp.created_at`+
			searchJobsWhere+`
ORDER BY jp.created_at DESC
LIMIT $2 OFFSET $3`,
		pattern, limit, offset,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	hits := []search.JobHit{}
	for rows.Next() {
		var id pgtype.UUID
		var title, employmentType string
		var companyName, logoURL, location pgtype.Text
		var createdAt pgtype.Timestamptz
		if err := rows.Scan(&id, &title, &companyName, &logoURL, &employmentType, &location, &createdAt); err != nil {
			return nil, 0, err
		}
		hits = append(hits, search.JobHit{
			ID:             uuidToString(id),
			Title:          title,
			CompanyName:    textPtr(companyName),
			CompanyLogoURL: textPtr(logoURL),
			EmploymentType: employmentType,
			Location:       textPtr(location),
			CreatedAt:      createdAt.Time,
		})
	}

	var total int
	if err := s.pool.QueryRow(ctx, `SELECT COUNT(*)`+searchJobsWhere, pattern).Scan(&total); err != nil {
		return nil, 0, err
	}
	return hits, total, nil
}
