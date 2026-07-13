package controller

import (
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/pkg/cast"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type AdminUserController struct {
	queries    *generated.Queries
	jwtService port.JWTService
}

func NewAdminUserController(pool *pgxpool.Pool, jwtService port.JWTService) *AdminUserController {
	return &AdminUserController{queries: generated.New(pool), jwtService: jwtService}
}

type adminUserItem struct {
	ID        string  `json:"id"`
	Username  string  `json:"username"`
	Name      string  `json:"name"`
	Email     *string `json:"email"`
	AvatarURL *string `json:"avatar_url"`
	CreatedAt string  `json:"created_at"`
}

type adminUserListResponse struct {
	Users      []adminUserItem `json:"users"`
	Total      int64           `json:"total"`
	Page       int             `json:"page"`
	PerPage    int             `json:"per_page"`
	TotalPages int             `json:"total_pages"`
}

func (c *AdminUserController) List(ctx echo.Context) error {
	page, _ := strconv.Atoi(ctx.QueryParam("page"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(ctx.QueryParam("per_page"))
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	search := ctx.QueryParam("q")
	offset := cast.Int32((page - 1) * perPage)

	var total int64
	var err error

	if search != "" {
		searchText := pgtype.Text{String: search, Valid: true}
		total, err = c.queries.CountSearchUsers(ctx.Request().Context(), searchText)
		if err != nil {
			return internalError(ctx, err.Error())
		}
		rows, err := c.queries.SearchUsers(ctx.Request().Context(), &generated.SearchUsersParams{
			Column1: searchText,
			Limit:   cast.Int32(perPage),
			Offset:  offset,
		})
		if err != nil {
			return internalError(ctx, err.Error())
		}
		return ctx.JSON(http.StatusOK, buildListResponse(toItemsFromSearch(rows), total, page, perPage))
	}

	total, err = c.queries.CountUsers(ctx.Request().Context())
	if err != nil {
		return internalError(ctx, err.Error())
	}
	rows, err := c.queries.ListUsers(ctx.Request().Context(), &generated.ListUsersParams{
		Limit:  cast.Int32(perPage),
		Offset: offset,
	})
	if err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.JSON(http.StatusOK, buildListResponse(toItemsFromList(rows), total, page, perPage))
}

func (c *AdminUserController) Delete(ctx echo.Context, id string) error {
	parsed, err := uuid.Parse(id)
	if err != nil {
		return badRequest(ctx, "invalid user id")
	}
	pgID := pgtype.UUID{Bytes: parsed, Valid: true}
	if err := c.queries.DeleteUser(ctx.Request().Context(), pgID); err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.NoContent(http.StatusNoContent)
}

func buildListResponse(users []adminUserItem, total int64, page, perPage int) adminUserListResponse {
	totalPages := int(total) / perPage
	if int(total)%perPage != 0 {
		totalPages++
	}
	if totalPages < 1 {
		totalPages = 1
	}
	return adminUserListResponse{
		Users:      users,
		Total:      total,
		Page:       page,
		PerPage:    perPage,
		TotalPages: totalPages,
	}
}

func textToPtr(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	s := t.String
	return &s
}

func pgUUID(id string) pgtype.UUID {
	parsed, err := uuid.Parse(id)
	if err != nil {
		return pgtype.UUID{}
	}
	return pgtype.UUID{Bytes: parsed, Valid: true}
}

func pgUUIDToString(id pgtype.UUID) string {
	if !id.Valid {
		return ""
	}
	return uuid.UUID(id.Bytes).String()
}

func toItemsFromList(rows []*generated.ListUsersRow) []adminUserItem {
	items := make([]adminUserItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, adminUserItem{
			ID:        pgUUIDToString(r.ID),
			Username:  r.Username,
			Name:      r.Name,
			Email:     textToPtr(r.Email),
			AvatarURL: textToPtr(r.AvatarUrl),
			CreatedAt: r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		})
	}
	return items
}

func toItemsFromSearch(rows []*generated.SearchUsersRow) []adminUserItem {
	items := make([]adminUserItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, adminUserItem{
			ID:        pgUUIDToString(r.ID),
			Username:  r.Username,
			Name:      r.Name,
			Email:     textToPtr(r.Email),
			AvatarURL: textToPtr(r.AvatarUrl),
			CreatedAt: r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		})
	}
	return items
}

func (c *AdminUserController) BypassLogin(ctx echo.Context, id string) error {
	parsed, err := uuid.Parse(id)
	if err != nil {
		return badRequest(ctx, "invalid user id")
	}
	pgID := pgtype.UUID{Bytes: parsed, Valid: true}

	u, err := c.queries.GetUserByID(ctx.Request().Context(), pgID)
	if err != nil {
		return notFoundError(ctx, "user not found")
	}

	accessToken, err := c.jwtService.GenerateAccessToken(pgUUIDToString(u.ID))
	if err != nil {
		return internalError(ctx, "failed to generate token")
	}

	rawRefresh, err := c.jwtService.GenerateRefreshToken()
	if err != nil {
		return internalError(ctx, "failed to generate token")
	}

	if err := c.queries.CreateRefreshToken(ctx.Request().Context(), &generated.CreateRefreshTokenParams{
		UserID:    u.ID,
		TokenHash: c.jwtService.HashRefreshToken(rawRefresh),
		ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(7 * 24 * time.Hour), Valid: true},
	}); err != nil {
		return internalError(ctx, "failed to store refresh token")
	}

	userResp := &openapi.ModelsAuthUserResponse{
		Id:       pgUUIDToString(u.ID),
		Username: u.Username,
		Name:     u.Name,
	}
	if u.AvatarUrl.Valid {
		userResp.AvatarUrl = &u.AvatarUrl.String
	}
	if u.Email.Valid {
		userResp.Email = &u.Email.String
	}

	setAuthCookies(ctx, &presenter.AuthTokenResponse{
		AccessToken:  accessToken,
		RefreshToken: rawRefresh,
		User:         userResp,
	})

	return ctx.JSON(http.StatusOK, map[string]string{
		"message":  "ok",
		"username": u.Username,
	})
}
