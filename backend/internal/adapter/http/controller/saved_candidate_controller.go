package controller

import (
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
)

type SavedCandidateController struct {
	pool *pgxpool.Pool
}

func NewSavedCandidateController(pool *pgxpool.Pool) *SavedCandidateController {
	return &SavedCandidateController{pool: pool}
}

func (c *SavedCandidateController) Save(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)
	userID := ctx.Param("userId")
	if userID == "" {
		return badRequest(ctx, "userId is required")
	}

	_, err := c.pool.Exec(ctx.Request().Context(),
		`INSERT INTO saved_candidates (company_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
		pgUUID(companyID), pgUUID(userID))
	if err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *SavedCandidateController) Unsave(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)
	userID := ctx.Param("userId")

	_, err := c.pool.Exec(ctx.Request().Context(),
		`DELETE FROM saved_candidates WHERE company_id = $1 AND user_id = $2`,
		pgUUID(companyID), pgUUID(userID))
	if err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *SavedCandidateController) List(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	if limit < 1 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	reqCtx := ctx.Request().Context()

	var total int
	if err := c.pool.QueryRow(reqCtx,
		`SELECT COUNT(*) FROM saved_candidates WHERE company_id = $1`,
		pgUUID(companyID)).Scan(&total); err != nil {
		return internalError(ctx, err.Error())
	}

	rows, err := c.pool.Query(reqCtx, `
		SELECT u.id, u.username, u.name, u.headline, u.avatar_url, u.profile_color, u.job_seeking_status, sc.created_at
		FROM saved_candidates sc
		JOIN users u ON u.id = sc.user_id
		WHERE sc.company_id = $1
		ORDER BY sc.created_at DESC
		LIMIT $2 OFFSET $3`,
		pgUUID(companyID), limit, offset)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	defer rows.Close()

	var users []talentCard
	for rows.Next() {
		var uid pgtype.UUID
		var username, name string
		var headline, avatarURL, profileColor, seekingStatus pgtype.Text
		var savedAt pgtype.Timestamptz

		if err := rows.Scan(&uid, &username, &name, &headline, &avatarURL, &profileColor, &seekingStatus, &savedAt); err != nil {
			continue
		}
		card := talentCard{
			UserID:   pgUUIDToString(uid),
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
		users = append(users, card)
	}

	if len(users) > 0 {
		tsc := &TalentSearchController{pool: c.pool}
		tsc.enrichCards(reqCtx, users)
	}

	if users == nil {
		users = []talentCard{}
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"users": users,
		"total": total,
	})
}

func (c *SavedCandidateController) IsSaved(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)
	userID := ctx.Param("userId")

	var exists bool
	err := c.pool.QueryRow(ctx.Request().Context(),
		`SELECT EXISTS(SELECT 1 FROM saved_candidates WHERE company_id = $1 AND user_id = $2)`,
		pgUUID(companyID), pgUUID(userID)).Scan(&exists)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.JSON(http.StatusOK, map[string]bool{"saved": exists})
}

func (c *SavedCandidateController) BulkCheck(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	var body struct {
		UserIDs []string `json:"user_ids"`
	}
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}

	rows, err := c.pool.Query(ctx.Request().Context(),
		`SELECT user_id FROM saved_candidates WHERE company_id = $1 AND user_id = ANY($2)`,
		pgUUID(companyID), pgUUIDs(body.UserIDs))
	if err != nil {
		return internalError(ctx, err.Error())
	}
	defer rows.Close()

	savedSet := make(map[string]bool)
	for rows.Next() {
		var uid pgtype.UUID
		if err := rows.Scan(&uid); err != nil {
			continue
		}
		savedSet[pgUUIDToString(uid)] = true
	}
	return ctx.JSON(http.StatusOK, map[string]any{"saved": savedSet})
}

func (c *SavedCandidateController) Count(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	var count int
	err := c.pool.QueryRow(ctx.Request().Context(),
		`SELECT COUNT(*) FROM saved_candidates WHERE company_id = $1`,
		pgUUID(companyID)).Scan(&count)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.JSON(http.StatusOK, map[string]int{"count": count})
}

func pgUUIDs(ids []string) []pgtype.UUID {
	result := make([]pgtype.UUID, len(ids))
	for i, id := range ids {
		result[i] = pgUUID(id)
	}
	return result
}
