package controller

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"strconv"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
)

type SimilarUsersController struct {
	pool *pgxpool.Pool
}

func NewSimilarUsersController(pool *pgxpool.Pool) *SimilarUsersController {
	return &SimilarUsersController{pool: pool}
}

type similarUserExperience struct {
	CompanyName string `json:"company_name"`
	Title       string `json:"title"`
	IsCurrent   bool   `json:"is_current"`
}

type similarUserItem struct {
	UserID       string                  `json:"user_id"`
	Username     string                  `json:"username"`
	Name         string                  `json:"name"`
	Headline     *string                 `json:"headline"`
	AvatarURL    *string                 `json:"avatar_url"`
	ProfileColor *string                 `json:"profile_color"`
	Similarity   float64                 `json:"similarity"`
	TopNeeds     []string                `json:"top_needs"`
	Experiences  []similarUserExperience `json:"experiences"`
}

func (c *SimilarUsersController) GetSimilarUsers(ctx echo.Context, userID string) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	if limit < 1 || limit > 50 {
		limit = 10
	}

	targetMu, err := c.getLatestMu(ctx.Request().Context(), userID)
	if err != nil {
		return notFoundError(ctx, "user has no work values result")
	}

	rows, err := c.pool.Query(ctx.Request().Context(),
		`SELECT DISTINCT ON (wns.user_id)
			wns.user_id, wns.mu,
			u.username, u.name, u.headline, u.avatar_url, u.profile_color
		FROM work_needs_scores wns
		JOIN users u ON u.id = wns.user_id
		WHERE wns.user_id != $1 AND u.is_public = true
		ORDER BY wns.user_id, wns.created_at DESC`,
		pgUUID(userID),
	)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	defer rows.Close()

	var candidates []similarUserItem
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

		sim := cosineSimilarity(targetMu, mu)
		if sim < 0.5 {
			continue
		}

		top3 := topNeedIDs(mu, 3)

		item := similarUserItem{
			UserID:     pgUUIDToString(uid),
			Username:   username,
			Name:       name,
			Similarity: math.Round(sim*1000) / 10,
			TopNeeds:   needLabels(top3),
		}
		if headline.Valid {
			item.Headline = &headline.String
		}
		if avatarURL.Valid {
			item.AvatarURL = &avatarURL.String
		}
		if profileColor.Valid {
			item.ProfileColor = &profileColor.String
		}

		candidates = append(candidates, item)
	}

	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].Similarity > candidates[j].Similarity
	})

	if len(candidates) > limit {
		candidates = candidates[:limit]
	}

	if len(candidates) > 0 {
		c.attachExperiences(ctx.Request().Context(), candidates)
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"users": candidates,
		"total": len(candidates),
	})
}

func (c *SimilarUsersController) attachExperiences(ctx context.Context, users []similarUserItem) {
	userIDs := make([]pgtype.UUID, len(users))
	for i, u := range users {
		userIDs[i] = pgUUID(u.UserID)
	}

	rows, err := c.pool.Query(ctx,
		`SELECT user_id, company_name, title, is_current
		FROM (
			SELECT user_id, company_name, title, is_current,
				ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY is_current DESC, start_year DESC, start_month DESC) AS rn
			FROM experiences
			WHERE user_id = ANY($1)
		) sub
		WHERE rn <= 2
		ORDER BY user_id, rn`,
		userIDs,
	)
	if err != nil {
		return
	}
	defer rows.Close()

	expMap := make(map[string][]similarUserExperience)
	for rows.Next() {
		var uid pgtype.UUID
		var companyName, title string
		var isCurrent bool
		if err := rows.Scan(&uid, &companyName, &title, &isCurrent); err != nil {
			continue
		}
		id := pgUUIDToString(uid)
		expMap[id] = append(expMap[id], similarUserExperience{
			CompanyName: companyName,
			Title:       title,
			IsCurrent:   isCurrent,
		})
	}

	for i := range users {
		if exps, ok := expMap[users[i].UserID]; ok {
			users[i].Experiences = exps
		} else {
			users[i].Experiences = []similarUserExperience{}
		}
	}
}

func (c *SimilarUsersController) getLatestMu(ctx context.Context, userID string) (map[string]float64, error) {
	var muJSON []byte
	err := c.pool.QueryRow(ctx,
		`SELECT mu FROM work_needs_scores WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
		pgUUID(userID),
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

func pgUUID(id string) pgtype.UUID {
	parsed, err := uuid.Parse(id)
	if err != nil {
		return pgtype.UUID{}
	}
	return pgtype.UUID{Bytes: parsed, Valid: true}
}

func cosineSimilarity(a, b map[string]float64) float64 {
	var dot, normA, normB float64
	for _, need := range workvalues.NeedIDs {
		va := a[need]
		vb := b[need]
		dot += va * vb
		normA += va * va
		normB += vb * vb
	}
	if normA == 0 || normB == 0 {
		return 0
	}
	return (dot/(math.Sqrt(normA)*math.Sqrt(normB)) + 1) / 2
}

type needScore struct {
	id string
	mu float64
}

func topNeedIDs(mu map[string]float64, n int) []string {
	scores := make([]needScore, 0, len(mu))
	for id, v := range mu {
		scores = append(scores, needScore{id, v})
	}
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].mu > scores[j].mu
	})
	if len(scores) > n {
		scores = scores[:n]
	}
	ids := make([]string, len(scores))
	for i, s := range scores {
		ids[i] = s.id
	}
	return ids
}

func needLabels(ids []string) []string {
	labels := make([]string, 0, len(ids))
	for _, id := range ids {
		def, ok := workvalues.NeedDefByID(id)
		if ok {
			labels = append(labels, def.Label)
		}
	}
	return labels
}
