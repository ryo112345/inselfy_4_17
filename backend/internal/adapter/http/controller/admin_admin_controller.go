package controller

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
)

type AdminAdminController struct {
	queries *generated.Queries
}

func NewAdminAdminController(pool *pgxpool.Pool) *AdminAdminController {
	return &AdminAdminController{queries: generated.New(pool)}
}

func toAdminItem(a *generated.Admin) openapi.ModelsAdminItem {
	item := openapi.ModelsAdminItem{
		Id:           pgUUIDToString(a.ID),
		Email:        a.Email,
		Name:         a.Name,
		ApiKeyPrefix: textToPtr(a.ApiKeyPrefix),
		CreatedAt:    a.CreatedAt.Time,
	}
	if a.LastUsedAt.Valid {
		t := a.LastUsedAt.Time
		item.LastUsedAt = &t
	}
	return item
}

// List handles GET /api/admin/admins.
func (c *AdminAdminController) List(ctx context.Context, _ openapi.AdminListAdminsRequestObject) (openapi.AdminListAdminsResponseObject, error) {
	rows, err := c.queries.ListAdmins(ctx)
	if err != nil {
		return nil, err
	}
	items := make([]openapi.ModelsAdminItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, toAdminItem(r))
	}
	return openapi.AdminListAdmins200JSONResponse(openapi.ModelsAdminListResponse{Admins: items}), nil
}

// Create handles POST /api/admin/admins.
func (c *AdminAdminController) Create(ctx context.Context, req openapi.AdminCreateAdminRequestObject) (openapi.AdminCreateAdminResponseObject, error) {
	if req.Body == nil {
		return openapi.AdminCreateAdmin400JSONResponse(badRequestBody("invalid request body")), nil
	}
	email := strings.TrimSpace(req.Body.Email)
	if email == "" || !strings.Contains(email, "@") {
		return openapi.AdminCreateAdmin400JSONResponse(badRequestBody("valid email is required")), nil
	}
	admin, err := c.queries.CreateAdmin(ctx, &generated.CreateAdminParams{
		Email: email,
		Name:  strings.TrimSpace(derefString(req.Body.Name)),
	})
	if err != nil { //nolint:nilerr // 重複メール等は従来どおり固定メッセージの 400 に丸める
		return openapi.AdminCreateAdmin400JSONResponse(badRequestBody("failed to create admin (email may already exist)")), nil
	}
	return openapi.AdminCreateAdmin201JSONResponse(toAdminItem(admin)), nil
}

// IssueKey handles POST /api/admin/admins/{adminId}/api-key. The raw token is
// returned exactly once; only its SHA-256 hash is stored.
func (c *AdminAdminController) IssueKey(ctx context.Context, req openapi.AdminIssueAdminApiKeyRequestObject) (openapi.AdminIssueAdminApiKeyResponseObject, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return nil, err
	}
	token := "admin_" + hex.EncodeToString(buf)
	sum := sha256.Sum256([]byte(token))
	prefix := token[:12] + "…"

	admin, err := c.queries.SetAdminAPIKey(ctx, &generated.SetAdminAPIKeyParams{
		ID:           pgUUID(req.AdminId),
		ApiKeyHash:   pgtype.Text{String: hex.EncodeToString(sum[:]), Valid: true},
		ApiKeyPrefix: pgtype.Text{String: prefix, Valid: true},
	})
	if err != nil { //nolint:nilerr // 対象不在は従来どおり固定メッセージの 404
		return openapi.AdminIssueAdminApiKey404JSONResponse(openapi.ModelsNotFoundError{
			Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
			Message: "admin not found",
		}), nil
	}
	return openapi.AdminIssueAdminApiKey200JSONResponse(openapi.ModelsAdminIssueKeyResponse{
		Admin:  toAdminItem(admin),
		ApiKey: token,
	}), nil
}

// Delete handles DELETE /api/admin/admins/{adminId}.
func (c *AdminAdminController) Delete(ctx context.Context, req openapi.AdminDeleteAdminRequestObject) (openapi.AdminDeleteAdminResponseObject, error) {
	if err := c.queries.DeleteAdmin(ctx, pgUUID(req.AdminId)); err != nil {
		return nil, err
	}
	return openapi.AdminDeleteAdmin204Response{}, nil
}
