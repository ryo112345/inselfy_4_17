package controller

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
)

type AdminAdminController struct {
	queries *generated.Queries
}

func NewAdminAdminController(pool *pgxpool.Pool) *AdminAdminController {
	return &AdminAdminController{queries: generated.New(pool)}
}

type adminItem struct {
	ID           string  `json:"id"`
	Email        string  `json:"email"`
	Name         string  `json:"name"`
	APIKeyPrefix *string `json:"api_key_prefix"`
	LastUsedAt   *string `json:"last_used_at"`
	CreatedAt    string  `json:"created_at"`
}

func toAdminItem(a *generated.Admin) adminItem {
	item := adminItem{
		ID:           pgUUIDToString(a.ID),
		Email:        a.Email,
		Name:         a.Name,
		APIKeyPrefix: textToPtr(a.ApiKeyPrefix),
		CreatedAt:    a.CreatedAt.Time.Format(time.RFC3339),
	}
	if a.LastUsedAt.Valid {
		s := a.LastUsedAt.Time.Format(time.RFC3339)
		item.LastUsedAt = &s
	}
	return item
}

func (c *AdminAdminController) List(ctx echo.Context) error {
	rows, err := c.queries.ListAdmins(ctx.Request().Context())
	if err != nil {
		return internalError(ctx, err.Error())
	}
	items := make([]adminItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, toAdminItem(r))
	}
	return ctx.JSON(http.StatusOK, map[string]any{"admins": items})
}

type createAdminRequest struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

func (c *AdminAdminController) Create(ctx echo.Context) error {
	var req createAdminRequest
	if err := ctx.Bind(&req); err != nil {
		return badRequest(ctx, "invalid request body")
	}
	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || !strings.Contains(req.Email, "@") {
		return badRequest(ctx, "valid email is required")
	}
	admin, err := c.queries.CreateAdmin(ctx.Request().Context(), &generated.CreateAdminParams{
		Email: req.Email,
		Name:  strings.TrimSpace(req.Name),
	})
	if err != nil {
		return badRequest(ctx, "failed to create admin (email may already exist)")
	}
	return ctx.JSON(http.StatusCreated, toAdminItem(admin))
}

// IssueKey generates a new personal API token for the admin. The raw token is
// returned exactly once; only its SHA-256 hash is stored.
func (c *AdminAdminController) IssueKey(ctx echo.Context, id string) error {
	pgID := pgUUID(id)
	if !pgID.Valid {
		return badRequest(ctx, "invalid admin id")
	}

	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return internalError(ctx, "failed to generate token")
	}
	token := "admin_" + hex.EncodeToString(buf)
	sum := sha256.Sum256([]byte(token))
	prefix := token[:12] + "…"

	admin, err := c.queries.SetAdminAPIKey(ctx.Request().Context(), &generated.SetAdminAPIKeyParams{
		ID:           pgID,
		ApiKeyHash:   pgtype.Text{String: hex.EncodeToString(sum[:]), Valid: true},
		ApiKeyPrefix: pgtype.Text{String: prefix, Valid: true},
	})
	if err != nil {
		return notFoundError(ctx, "admin not found")
	}
	return ctx.JSON(http.StatusOK, map[string]any{
		"admin":   toAdminItem(admin),
		"api_key": token,
	})
}

func (c *AdminAdminController) Delete(ctx echo.Context, id string) error {
	pgID := pgUUID(id)
	if !pgID.Valid {
		return badRequest(ctx, "invalid admin id")
	}
	if err := c.queries.DeleteAdmin(ctx.Request().Context(), pgID); err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.NoContent(http.StatusNoContent)
}
