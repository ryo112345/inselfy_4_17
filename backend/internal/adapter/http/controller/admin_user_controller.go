package controller

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

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

// adminPagination replicates the echo-era page/per_page defaults
// (page>=1, per_page 1-100 else 20).
func adminPagination(page, perPage *int32) (int, int) {
	p, pp := 1, 20
	if page != nil && *page >= 1 {
		p = int(*page)
	}
	if perPage != nil && *perPage >= 1 && *perPage <= 100 {
		pp = int(*perPage)
	}
	return p, pp
}

// List handles GET /api/admin/users.
func (c *AdminUserController) List(ctx context.Context, req openapi.AdminListUsersRequestObject) (openapi.AdminListUsersResponseObject, error) {
	page, perPage := adminPagination(req.Params.Page, req.Params.PerPage)
	search := derefString(req.Params.Q)
	offset := cast.Int32((page - 1) * perPage)

	if search != "" {
		searchText := pgtype.Text{String: search, Valid: true}
		total, err := c.queries.CountSearchUsers(ctx, searchText)
		if err != nil {
			return nil, err
		}
		rows, err := c.queries.SearchUsers(ctx, &generated.SearchUsersParams{
			Column1: searchText,
			Limit:   cast.Int32(perPage),
			Offset:  offset,
		})
		if err != nil {
			return nil, err
		}
		return openapi.AdminListUsers200JSONResponse(buildListResponse(toItemsFromSearch(rows), total, page, perPage)), nil
	}

	total, err := c.queries.CountUsers(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := c.queries.ListUsers(ctx, &generated.ListUsersParams{
		Limit:  cast.Int32(perPage),
		Offset: offset,
	})
	if err != nil {
		return nil, err
	}
	return openapi.AdminListUsers200JSONResponse(buildListResponse(toItemsFromList(rows), total, page, perPage)), nil
}

// Delete handles DELETE /api/admin/users/{userId}.
func (c *AdminUserController) Delete(ctx context.Context, req openapi.AdminDeleteUserRequestObject) (openapi.AdminDeleteUserResponseObject, error) {
	if err := c.queries.DeleteUser(ctx, pgUUID(req.UserId)); err != nil {
		return nil, err
	}
	return openapi.AdminDeleteUser204Response{}, nil
}

func buildListResponse(users []openapi.ModelsAdminUserItem, total int64, page, perPage int) openapi.ModelsAdminUserListResponse {
	totalPages := int(total) / perPage
	if int(total)%perPage != 0 {
		totalPages++
	}
	if totalPages < 1 {
		totalPages = 1
	}
	return openapi.ModelsAdminUserListResponse{
		Users:      users,
		Total:      total,
		Page:       cast.Int32(page),
		PerPage:    cast.Int32(perPage),
		TotalPages: cast.Int32(totalPages),
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

func toItemsFromList(rows []*generated.ListUsersRow) []openapi.ModelsAdminUserItem {
	items := make([]openapi.ModelsAdminUserItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, openapi.ModelsAdminUserItem{
			Id:        pgUUIDToString(r.ID),
			Username:  r.Username,
			Name:      r.Name,
			Email:     textToPtr(r.Email),
			AvatarUrl: textToPtr(r.AvatarUrl),
			CreatedAt: r.CreatedAt.Time,
		})
	}
	return items
}

func toItemsFromSearch(rows []*generated.SearchUsersRow) []openapi.ModelsAdminUserItem {
	items := make([]openapi.ModelsAdminUserItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, openapi.ModelsAdminUserItem{
			Id:        pgUUIDToString(r.ID),
			Username:  r.Username,
			Name:      r.Name,
			Email:     textToPtr(r.Email),
			AvatarUrl: textToPtr(r.AvatarUrl),
			CreatedAt: r.CreatedAt.Time,
		})
	}
	return items
}

// adminUserBypassLoginWithCookies wraps the 200 response to set auth cookies
// (docs/strict-server-migration.md 3-3 cookie パターン).
type adminUserBypassLoginWithCookies struct {
	inner   openapi.AdminBypassLoginAsUserResponseObject
	cookies []*http.Cookie
}

func (r adminUserBypassLoginWithCookies) VisitAdminBypassLoginAsUserResponse(w http.ResponseWriter) error {
	setCookies(w, r.cookies)
	return r.inner.VisitAdminBypassLoginAsUserResponse(w)
}

// BypassLogin handles POST /api/admin/users/{userId}/bypass-login.
func (c *AdminUserController) BypassLogin(ctx context.Context, req openapi.AdminBypassLoginAsUserRequestObject) (openapi.AdminBypassLoginAsUserResponseObject, error) {
	u, err := c.queries.GetUserByID(ctx, pgUUID(req.UserId))
	if err != nil { //nolint:nilerr // 対象不在は従来どおり固定メッセージの 404
		return openapi.AdminBypassLoginAsUser404JSONResponse(openapi.ModelsNotFoundError{
			Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
			Message: "user not found",
		}), nil
	}

	accessToken, err := c.jwtService.GenerateAccessToken(pgUUIDToString(u.ID))
	if err != nil {
		return nil, err
	}

	rawRefresh, err := c.jwtService.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}

	if err := c.queries.CreateRefreshToken(ctx, &generated.CreateRefreshTokenParams{
		UserID:    u.ID,
		TokenHash: c.jwtService.HashRefreshToken(rawRefresh),
		ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(7 * 24 * time.Hour), Valid: true},
	}); err != nil {
		return nil, err
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

	return adminUserBypassLoginWithCookies{
		inner: openapi.AdminBypassLoginAsUser200JSONResponse(openapi.ModelsAdminUserBypassLoginResponse{
			Message:  "ok",
			Username: u.Username,
		}),
		cookies: authCookies(isSecureRequest(ctx), &presenter.AuthTokenResponse{
			AccessToken:  accessToken,
			RefreshToken: rawRefresh,
			User:         userResp,
		}),
	}, nil
}
