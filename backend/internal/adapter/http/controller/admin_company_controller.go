package controller

import (
	"context"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/pkg/cast"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type AdminCompanyController struct {
	queries    *generated.Queries
	jwtService port.JWTService
}

func NewAdminCompanyController(pool *pgxpool.Pool, jwtService port.JWTService) *AdminCompanyController {
	return &AdminCompanyController{queries: generated.New(pool), jwtService: jwtService}
}

// List handles GET /api/admin/companies.
func (c *AdminCompanyController) List(ctx context.Context, req openapi.AdminListCompaniesRequestObject) (openapi.AdminListCompaniesResponseObject, error) {
	page, perPage := adminPagination(req.Params.Page, req.Params.PerPage)
	offset := cast.Int32((page - 1) * perPage)

	if req.Params.Status != nil {
		cs := generated.CompanyStatus(*req.Params.Status)
		total, err := c.queries.CountCompanyAccountsByStatus(ctx, cs)
		if err != nil {
			return nil, err
		}
		rows, err := c.queries.ListCompanyAccountsByStatus(ctx, &generated.ListCompanyAccountsByStatusParams{
			Status: cs,
			Limit:  cast.Int32(perPage),
			Offset: offset,
		})
		if err != nil {
			return nil, err
		}
		return openapi.AdminListCompanies200JSONResponse(buildCompanyListResponse(toCompanyItems(rows), total, page, perPage)), nil
	}

	total, err := c.queries.CountAllCompanyAccounts(ctx)
	if err != nil {
		return nil, err
	}
	rows, err := c.queries.ListAllCompanyAccounts(ctx, &generated.ListAllCompanyAccountsParams{
		Limit:  cast.Int32(perPage),
		Offset: offset,
	})
	if err != nil {
		return nil, err
	}
	return openapi.AdminListCompanies200JSONResponse(buildCompanyListResponse(toCompanyItems(rows), total, page, perPage)), nil
}

// UpdateStatus handles PATCH /api/admin/companies/{companyId}/status.
// status の enum（approved/rejected）は上流 validator が強制する。
func (c *AdminCompanyController) UpdateStatus(ctx context.Context, req openapi.AdminUpdateCompanyStatusRequestObject) (openapi.AdminUpdateCompanyStatusResponseObject, error) {
	if req.Body == nil {
		return openapi.AdminUpdateCompanyStatus400JSONResponse(badRequestBody("invalid request")), nil
	}

	row, err := c.queries.UpdateCompanyStatus(ctx, &generated.UpdateCompanyStatusParams{
		ID:     pgUUID(req.CompanyId),
		Status: generated.CompanyStatus(req.Body.Status),
	})
	if err != nil {
		return nil, err
	}

	return openapi.AdminUpdateCompanyStatus200JSONResponse(openapi.ModelsAdminCompanyItem{
		Id:                pgUUIDToString(row.ID),
		Email:             row.Email,
		CompanyName:       row.CompanyName,
		ContactPersonName: row.ContactPersonName,
		PhoneNumber:       row.PhoneNumber,
		Status:            openapi.ModelsCompanyStatus(row.Status),
		CreatedAt:         row.CreatedAt.Time,
	}), nil
}

func toCompanyItems(rows []*generated.CompanyAccount) []openapi.ModelsAdminCompanyItem {
	items := make([]openapi.ModelsAdminCompanyItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, openapi.ModelsAdminCompanyItem{
			Id:                pgUUIDToString(r.ID),
			Email:             r.Email,
			CompanyName:       r.CompanyName,
			ContactPersonName: r.ContactPersonName,
			PhoneNumber:       r.PhoneNumber,
			Status:            openapi.ModelsCompanyStatus(r.Status),
			CreatedAt:         r.CreatedAt.Time,
		})
	}
	return items
}

func buildCompanyListResponse(companies []openapi.ModelsAdminCompanyItem, total int64, page, perPage int) openapi.ModelsAdminCompanyListResponse {
	totalPages := int(total) / perPage
	if int(total)%perPage != 0 {
		totalPages++
	}
	if totalPages < 1 {
		totalPages = 1
	}
	return openapi.ModelsAdminCompanyListResponse{
		Companies:  companies,
		Total:      total,
		Page:       cast.Int32(page),
		PerPage:    cast.Int32(perPage),
		TotalPages: cast.Int32(totalPages),
	}
}

// adminCompanyBypassLoginWithCookies wraps the 200 response to set company
// auth cookies (docs/strict-server-migration.md 3-3 cookie パターン).
type adminCompanyBypassLoginWithCookies struct {
	inner   openapi.AdminBypassLoginAsCompanyResponseObject
	cookies []*http.Cookie
}

func (r adminCompanyBypassLoginWithCookies) VisitAdminBypassLoginAsCompanyResponse(w http.ResponseWriter) error {
	setCookies(w, r.cookies)
	return r.inner.VisitAdminBypassLoginAsCompanyResponse(w)
}

// BypassLogin handles POST /api/admin/companies/{companyId}/bypass-login.
func (c *AdminCompanyController) BypassLogin(ctx context.Context, req openapi.AdminBypassLoginAsCompanyRequestObject) (openapi.AdminBypassLoginAsCompanyResponseObject, error) {
	ca, err := c.queries.GetCompanyAccountByID(ctx, pgUUID(req.CompanyId))
	if err != nil { //nolint:nilerr // 対象不在は従来どおり固定メッセージの 404
		return openapi.AdminBypassLoginAsCompany404JSONResponse(openapi.ModelsNotFoundError{
			Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
			Message: "company not found",
		}), nil
	}

	companyID := pgUUIDToString(ca.ID)
	accessToken, err := c.jwtService.GenerateCompanyAccessToken(companyID)
	if err != nil {
		return nil, err
	}

	rawRefresh, err := c.jwtService.GenerateRefreshToken()
	if err != nil {
		return nil, err
	}

	if err := c.queries.CreateCompanyRefreshToken(ctx, &generated.CreateCompanyRefreshTokenParams{
		CompanyID: ca.ID,
		TokenHash: c.jwtService.HashRefreshToken(rawRefresh),
		ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(7 * 24 * time.Hour), Valid: true},
	}); err != nil {
		return nil, err
	}

	return adminCompanyBypassLoginWithCookies{
		inner: openapi.AdminBypassLoginAsCompany200JSONResponse(openapi.ModelsAdminCompanyBypassLoginResponse{
			Message:     "ok",
			CompanyName: ca.CompanyName,
		}),
		cookies: companyAuthCookies(isSecureRequest(ctx), &presenter.CompanyAuthTokenResponse{
			AccessToken:  accessToken,
			RefreshToken: rawRefresh,
			Company: &openapi.ModelsCompanyResponse{
				Id:                companyID,
				Email:             ca.Email,
				CompanyName:       ca.CompanyName,
				ContactPersonName: ca.ContactPersonName,
				PhoneNumber:       ca.PhoneNumber,
				Status:            openapi.ModelsCompanyStatus(ca.Status),
				CreatedAt:         ca.CreatedAt.Time,
			},
		}),
	}, nil
}
