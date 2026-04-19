package controller

import (
	"net/http"
	"strconv"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
)

type AdminUserController struct {
	queries *generated.Queries
}

func NewAdminUserController(pool *pgxpool.Pool) *AdminUserController {
	return &AdminUserController{queries: generated.New(pool)}
}

type adminUserItem struct {
	ID          string  `json:"id"`
	Username    string  `json:"username"`
	Name        string  `json:"name"`
	DisplayName *string `json:"display_name"`
	Email       *string `json:"email"`
	AvatarURL   *string `json:"avatar_url"`
	CreatedAt   string  `json:"created_at"`
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
	offset := int32((page - 1) * perPage)

	var total int64
	var err error

	if search != "" {
		searchText := pgtype.Text{String: search, Valid: true}
		total, err = c.queries.CountSearchUsers(ctx.Request().Context(), searchText)
		if err != nil {
			return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
		}
		rows, err := c.queries.SearchUsers(ctx.Request().Context(), &generated.SearchUsersParams{
			Column1: searchText,
			Limit:   int32(perPage),
			Offset:  offset,
		})
		if err != nil {
			return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
		}
		return ctx.JSON(http.StatusOK, buildListResponse(toItemsFromSearch(rows), total, page, perPage))
	}

	total, err = c.queries.CountUsers(ctx.Request().Context())
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	rows, err := c.queries.ListUsers(ctx.Request().Context(), &generated.ListUsersParams{
		Limit:  int32(perPage),
		Offset: offset,
	})
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	return ctx.JSON(http.StatusOK, buildListResponse(toItemsFromList(rows), total, page, perPage))
}

func (c *AdminUserController) Delete(ctx echo.Context, id string) error {
	parsed, err := uuid.Parse(id)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid user id"})
	}
	pgID := pgtype.UUID{Bytes: parsed, Valid: true}
	if err := c.queries.DeleteUser(ctx.Request().Context(), pgID); err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
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
			ID:          pgUUIDToString(r.ID),
			Username:    r.Username,
			Name:        r.Name,
			DisplayName: textToPtr(r.DisplayName),
			Email:       textToPtr(r.Email),
			AvatarURL:   textToPtr(r.AvatarUrl),
			CreatedAt:   r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		})
	}
	return items
}

func toItemsFromSearch(rows []*generated.SearchUsersRow) []adminUserItem {
	items := make([]adminUserItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, adminUserItem{
			ID:          pgUUIDToString(r.ID),
			Username:    r.Username,
			Name:        r.Name,
			DisplayName: textToPtr(r.DisplayName),
			Email:       textToPtr(r.Email),
			AvatarURL:   textToPtr(r.AvatarUrl),
			CreatedAt:   r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		})
	}
	return items
}
