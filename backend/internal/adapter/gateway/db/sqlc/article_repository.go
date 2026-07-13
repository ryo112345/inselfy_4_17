package sqlc

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	"github.com/akiyama/inselfy/backend/internal/domain/article"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/pkg/cast"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type ArticleRepository struct {
	queries *generated.Queries
}

var _ port.ArticleRepository = (*ArticleRepository)(nil)

func NewArticleRepository(pool *pgxpool.Pool) *ArticleRepository {
	return &ArticleRepository{queries: generated.New(pool)}
}

func (r *ArticleRepository) Create(ctx context.Context, a *article.Article) (*article.Article, error) {
	q := queriesForContext(ctx, r.queries)
	row, err := q.CreateArticle(ctx, &generated.CreateArticleParams{
		AuthorType:      generated.AuthorType(a.AuthorType),
		AuthorUserID:    optionalUUID(a.AuthorUserID),
		AuthorCompanyID: optionalUUID(a.AuthorCompanyID),
		Title:           a.Title,
		Body:            a.Body,
		IsPaid:          a.IsPaid,
		PriceYen:        cast.Int32(a.PriceYen),
		CoverImageUrl:   pgText(a.CoverImageURL),
		Tags:            nonNilTags(a.Tags),
	})
	if err != nil {
		return nil, err
	}
	return articleModelToDomain(row), nil
}

func (r *ArticleRepository) GetByID(ctx context.Context, id string) (*article.ArticleWithAuthor, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrNotFound
	}
	row, err := q.GetArticleByID(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return &article.ArticleWithAuthor{
		Article:        rowToDomainArticle(row.ID, row.AuthorType, row.AuthorUserID, row.AuthorCompanyID, row.Title, row.Body, row.Status, row.IsPaid, row.PriceYen, row.StripePriceID, row.CoverImageUrl, row.Tags, row.CreatedAt, row.UpdatedAt, row.PublishedAt),
		AuthorName:     row.AuthorName,
		AuthorUsername: textPtr(row.AuthorUsername),
	}, nil
}

func (r *ArticleRepository) List(ctx context.Context, limit, offset int) ([]*article.ArticleWithAuthor, int, error) {
	q := queriesForContext(ctx, r.queries)
	rows, err := q.ListPublishedArticles(ctx, &generated.ListPublishedArticlesParams{
		Limit:  cast.Int32(limit),
		Offset: cast.Int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	count, err := q.CountPublishedArticles(ctx)
	if err != nil {
		return nil, 0, err
	}
	articles := make([]*article.ArticleWithAuthor, len(rows))
	for i, row := range rows {
		articles[i] = &article.ArticleWithAuthor{
			Article:        rowToDomainArticle(row.ID, row.AuthorType, row.AuthorUserID, row.AuthorCompanyID, row.Title, row.Body, row.Status, row.IsPaid, row.PriceYen, row.StripePriceID, row.CoverImageUrl, row.Tags, row.CreatedAt, row.UpdatedAt, row.PublishedAt),
			AuthorName:     row.AuthorName,
			AuthorUsername: textPtr(row.AuthorUsername),
		}
	}
	return articles, int(count), nil
}

func (r *ArticleRepository) ListByAuthor(ctx context.Context, authorType article.AuthorType, authorID string, limit, offset int) ([]*article.ArticleWithAuthor, int, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(authorID)
	if err != nil {
		return nil, 0, domainerr.ErrBadRequest
	}

	if authorType == article.AuthorTypeUser {
		rows, err := q.ListArticlesByUserAuthor(ctx, &generated.ListArticlesByUserAuthorParams{
			AuthorUserID: pgID,
			Limit:        cast.Int32(limit),
			Offset:       cast.Int32(offset),
		})
		if err != nil {
			return nil, 0, err
		}
		count, err := q.CountArticlesByUserAuthor(ctx, pgID)
		if err != nil {
			return nil, 0, err
		}
		articles := make([]*article.ArticleWithAuthor, len(rows))
		for i, row := range rows {
			articles[i] = &article.ArticleWithAuthor{
				Article:        rowToDomainArticle(row.ID, row.AuthorType, row.AuthorUserID, row.AuthorCompanyID, row.Title, row.Body, row.Status, row.IsPaid, row.PriceYen, row.StripePriceID, row.CoverImageUrl, row.Tags, row.CreatedAt, row.UpdatedAt, row.PublishedAt),
				AuthorName:     row.AuthorName,
				AuthorUsername: &row.AuthorUsername,
			}
		}
		return articles, int(count), nil
	}

	rows, err := q.ListArticlesByCompanyAuthor(ctx, &generated.ListArticlesByCompanyAuthorParams{
		AuthorCompanyID: pgID,
		Limit:           cast.Int32(limit),
		Offset:          cast.Int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	count, err := q.CountArticlesByCompanyAuthor(ctx, pgID)
	if err != nil {
		return nil, 0, err
	}
	articles := make([]*article.ArticleWithAuthor, len(rows))
	for i, row := range rows {
		articles[i] = &article.ArticleWithAuthor{
			Article:    rowToDomainArticle(row.ID, row.AuthorType, row.AuthorUserID, row.AuthorCompanyID, row.Title, row.Body, row.Status, row.IsPaid, row.PriceYen, row.StripePriceID, row.CoverImageUrl, row.Tags, row.CreatedAt, row.UpdatedAt, row.PublishedAt),
			AuthorName: row.AuthorName,
		}
	}
	return articles, int(count), nil
}

func (r *ArticleRepository) Publish(ctx context.Context, id string) (*article.Article, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrNotFound
	}
	row, err := q.PublishArticle(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return articleModelToDomain(row), nil
}

func (r *ArticleRepository) Update(ctx context.Context, a *article.Article) (*article.Article, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(a.ID)
	if err != nil {
		return nil, domainerr.ErrNotFound
	}
	row, err := q.UpdateArticle(ctx, &generated.UpdateArticleParams{
		ID:            pgID,
		Title:         a.Title,
		Body:          a.Body,
		IsPaid:        a.IsPaid,
		PriceYen:      cast.Int32(a.PriceYen),
		CoverImageUrl: pgText(a.CoverImageURL),
		Tags:          nonNilTags(a.Tags),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return articleModelToDomain(row), nil
}

func (r *ArticleRepository) Delete(ctx context.Context, id string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrNotFound
	}
	return q.DeleteArticle(ctx, pgID)
}

func nonNilTags(tags []string) []string {
	if tags == nil {
		return []string{}
	}
	return tags
}

func articleModelToDomain(row *generated.Article) *article.Article {
	return rowToDomainArticlePtr(row.ID, row.AuthorType, row.AuthorUserID, row.AuthorCompanyID, row.Title, row.Body, row.Status, row.IsPaid, row.PriceYen, row.StripePriceID, row.CoverImageUrl, row.Tags, row.CreatedAt, row.UpdatedAt, row.PublishedAt)
}

func rowToDomainArticlePtr(id pgtype.UUID, authorType generated.AuthorType, authorUserID, authorCompanyID pgtype.UUID, title, body string, status generated.ArticleStatus, isPaid bool, priceYen int32, stripePriceID, coverImageURL pgtype.Text, tags []string, createdAt, updatedAt, publishedAt pgtype.Timestamptz) *article.Article {
	a := rowToDomainArticle(id, authorType, authorUserID, authorCompanyID, title, body, status, isPaid, priceYen, stripePriceID, coverImageURL, tags, createdAt, updatedAt, publishedAt)
	return &a
}

func rowToDomainArticle(id pgtype.UUID, authorType generated.AuthorType, authorUserID, authorCompanyID pgtype.UUID, title, body string, status generated.ArticleStatus, isPaid bool, priceYen int32, stripePriceID, coverImageURL pgtype.Text, tags []string, createdAt, updatedAt, publishedAt pgtype.Timestamptz) article.Article {
	a := article.Article{
		ID:              uuidToString(id),
		AuthorType:      article.AuthorType(authorType),
		AuthorUserID:    uuidPtr(authorUserID),
		AuthorCompanyID: uuidPtr(authorCompanyID),
		Title:           title,
		Body:            body,
		Status:          article.Status(status),
		IsPaid:          isPaid,
		PriceYen:        int(priceYen),
		StripePriceID:   textPtr(stripePriceID),
		CoverImageURL:   textPtr(coverImageURL),
		Tags:            tags,
		CreatedAt:       createdAt.Time,
		UpdatedAt:       updatedAt.Time,
	}
	if publishedAt.Valid {
		t := publishedAt.Time
		a.PublishedAt = &t
	}
	return a
}
