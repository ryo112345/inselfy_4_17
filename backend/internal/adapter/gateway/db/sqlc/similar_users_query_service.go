package sqlc

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type SimilarUsersQueryService struct {
	pool *pgxpool.Pool
}

var _ port.SimilarUsersQueryService = (*SimilarUsersQueryService)(nil)

func NewSimilarUsersQueryService(pool *pgxpool.Pool) *SimilarUsersQueryService {
	return &SimilarUsersQueryService{pool: pool}
}

func (s *SimilarUsersQueryService) LatestMu(ctx context.Context, userID string) (map[string]float64, error) {
	var muJSON []byte
	err := s.pool.QueryRow(ctx,
		`SELECT mu FROM work_needs_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
		lenientUUID(userID),
	).Scan(&muJSON)
	if err != nil {
		return nil, err
	}
	var mu map[string]float64
	if err := json.Unmarshal(muJSON, &mu); err != nil {
		return nil, err
	}
	return mu, nil
}

func (s *SimilarUsersQueryService) ListPublicUsersWithMu(ctx context.Context, excludeUserID string) ([]workvalues.UserWithMu, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT DISTINCT ON (wns.user_id)
			wns.user_id, wns.mu,
			u.username, u.name, u.headline, u.avatar_url, u.profile_color
		FROM work_needs_scores wns
		JOIN users u ON u.id = wns.user_id
		WHERE wns.user_id != $1 AND u.is_public = true
		ORDER BY wns.user_id, wns.created_at DESC`,
		lenientUUID(excludeUserID),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []workvalues.UserWithMu
	for rows.Next() {
		var uid pgtype.UUID
		var muJSON []byte
		var username, name string
		var headline, avatarURL, profileColor pgtype.Text

		if err := rows.Scan(&uid, &muJSON, &username, &name, &headline, &avatarURL, &profileColor); err != nil {
			continue
		}

		var mu map[string]float64
		if err := json.Unmarshal(muJSON, &mu); err != nil {
			continue
		}

		u := workvalues.UserWithMu{
			UserID:   uuidToString(uid),
			Username: username,
			Name:     name,
			Mu:       mu,
		}
		if headline.Valid {
			u.Headline = &headline.String
		}
		if avatarURL.Valid {
			u.AvatarURL = &avatarURL.String
		}
		if profileColor.Valid {
			u.ProfileColor = &profileColor.String
		}
		users = append(users, u)
	}
	return users, nil
}

func (s *SimilarUsersQueryService) RecentExperiences(ctx context.Context, userIDs []string) (map[string][]workvalues.SimilarUserExperience, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT user_id, company_name, title, is_current
		FROM (
			SELECT user_id, company_name, title, is_current,
				ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY is_current DESC, start_year DESC, start_month DESC) AS rn
			FROM experiences
			WHERE user_id = ANY($1)
		) sub
		WHERE rn <= 2
		ORDER BY user_id, rn`,
		lenientUUIDs(userIDs),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	expMap := make(map[string][]workvalues.SimilarUserExperience)
	for rows.Next() {
		var uid pgtype.UUID
		var companyName, title string
		var isCurrent bool
		if err := rows.Scan(&uid, &companyName, &title, &isCurrent); err != nil {
			continue
		}
		id := uuidToString(uid)
		expMap[id] = append(expMap[id], workvalues.SimilarUserExperience{
			CompanyName: companyName,
			Title:       title,
			IsCurrent:   isCurrent,
		})
	}
	return expMap, nil
}
