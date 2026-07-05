package sqlc

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/domain/talentsearch"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type SavedCandidateQueryService struct {
	pool *pgxpool.Pool
}

var _ port.SavedCandidateQueryService = (*SavedCandidateQueryService)(nil)

func NewSavedCandidateQueryService(pool *pgxpool.Pool) *SavedCandidateQueryService {
	return &SavedCandidateQueryService{pool: pool}
}

func (s *SavedCandidateQueryService) ListCards(ctx context.Context, companyID string, limit, offset int) ([]talentsearch.Card, int, error) {
	var total int
	if err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM saved_candidates WHERE company_id = $1`,
		lenientUUID(companyID)).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := s.pool.Query(ctx, `
		SELECT u.id, u.username, u.name, u.headline, u.avatar_url, u.profile_color, u.job_seeking_status, sc.created_at
		FROM saved_candidates sc
		JOIN users u ON u.id = sc.user_id
		WHERE sc.company_id = $1
		ORDER BY sc.created_at DESC
		LIMIT $2 OFFSET $3`,
		lenientUUID(companyID), limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var cards []talentsearch.Card
	for rows.Next() {
		var uid pgtype.UUID
		var username, name string
		var headline, avatarURL, profileColor, seekingStatus pgtype.Text
		var savedAt pgtype.Timestamptz

		if err := rows.Scan(&uid, &username, &name, &headline, &avatarURL, &profileColor, &seekingStatus, &savedAt); err != nil {
			continue
		}
		card := talentsearch.Card{
			UserID:   uuidToString(uid),
			Username: username,
			Name:     name,
		}
		if headline.Valid {
			card.Headline = &headline.String
		}
		if avatarURL.Valid {
			card.AvatarURL = &avatarURL.String
		}
		if profileColor.Valid {
			card.ProfileColor = &profileColor.String
		}
		if seekingStatus.Valid {
			card.JobSeekingStatus = &seekingStatus.String
		}
		cards = append(cards, card)
	}

	if len(cards) > 0 {
		enrichTalentCards(ctx, s.pool, cards)
	}
	return cards, total, nil
}
