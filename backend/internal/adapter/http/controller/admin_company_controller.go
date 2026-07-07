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
	"github.com/akiyama/inselfy/backend/internal/port"
)

type AdminCompanyController struct {
	queries    *generated.Queries
	jwtService port.JWTService
}

func NewAdminCompanyController(pool *pgxpool.Pool, jwtService port.JWTService) *AdminCompanyController {
	return &AdminCompanyController{queries: generated.New(pool), jwtService: jwtService}
}

type adminCompanyItem struct {
	ID                string `json:"id"`
	Email             string `json:"email"`
	CompanyName       string `json:"companyName"`
	ContactPersonName string `json:"contactPersonName"`
	PhoneNumber       string `json:"phoneNumber"`
	Status            string `json:"status"`
	CreatedAt         string `json:"createdAt"`
}

type adminCompanyListResponse struct {
	Companies  []adminCompanyItem `json:"companies"`
	Total      int64              `json:"total"`
	Page       int                `json:"page"`
	PerPage    int                `json:"per_page"`
	TotalPages int                `json:"total_pages"`
}

func (c *AdminCompanyController) List(ctx echo.Context) error {
	page, _ := strconv.Atoi(ctx.QueryParam("page"))
	if page < 1 {
		page = 1
	}
	perPage, _ := strconv.Atoi(ctx.QueryParam("per_page"))
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	offset := int32((page - 1) * perPage)
	status := ctx.QueryParam("status")

	var total int64
	var err error

	if status != "" {
		cs := generated.CompanyStatus(status)
		total, err = c.queries.CountCompanyAccountsByStatus(ctx.Request().Context(), cs)
		if err != nil {
			return internalError(ctx, err.Error())
		}
		rows, err := c.queries.ListCompanyAccountsByStatus(ctx.Request().Context(), &generated.ListCompanyAccountsByStatusParams{
			Status: cs,
			Limit:  int32(perPage),
			Offset: offset,
		})
		if err != nil {
			return internalError(ctx, err.Error())
		}
		return ctx.JSON(http.StatusOK, buildCompanyListResponse(toCompanyItems(rows), total, page, perPage))
	}

	total, err = c.queries.CountAllCompanyAccounts(ctx.Request().Context())
	if err != nil {
		return internalError(ctx, err.Error())
	}
	rows, err := c.queries.ListAllCompanyAccounts(ctx.Request().Context(), &generated.ListAllCompanyAccountsParams{
		Limit:  int32(perPage),
		Offset: offset,
	})
	if err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.JSON(http.StatusOK, buildCompanyListResponse(toCompanyItems(rows), total, page, perPage))
}

func (c *AdminCompanyController) UpdateStatus(ctx echo.Context, id string) error {
	parsed, err := uuid.Parse(id)
	if err != nil {
		return badRequest(ctx, "invalid company id")
	}

	var body struct {
		Status string `json:"status"`
	}
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request")
	}

	if body.Status != "approved" && body.Status != "rejected" {
		return badRequest(ctx, "status must be 'approved' or 'rejected'")
	}

	pgID := pgtype.UUID{Bytes: parsed, Valid: true}
	row, err := c.queries.UpdateCompanyStatus(ctx.Request().Context(), &generated.UpdateCompanyStatusParams{
		ID:     pgID,
		Status: generated.CompanyStatus(body.Status),
	})
	if err != nil {
		return internalError(ctx, err.Error())
	}

	return ctx.JSON(http.StatusOK, adminCompanyItem{
		ID:                pgUUIDToString(row.ID),
		Email:             row.Email,
		CompanyName:       row.CompanyName,
		ContactPersonName: row.ContactPersonName,
		PhoneNumber:       row.PhoneNumber,
		Status:            string(row.Status),
		CreatedAt:         row.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
	})
}

func toCompanyItems(rows []*generated.CompanyAccount) []adminCompanyItem {
	items := make([]adminCompanyItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, adminCompanyItem{
			ID:                pgUUIDToString(r.ID),
			Email:             r.Email,
			CompanyName:       r.CompanyName,
			ContactPersonName: r.ContactPersonName,
			PhoneNumber:       r.PhoneNumber,
			Status:            string(r.Status),
			CreatedAt:         r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		})
	}
	return items
}

func buildCompanyListResponse(companies []adminCompanyItem, total int64, page, perPage int) adminCompanyListResponse {
	totalPages := int(total) / perPage
	if int(total)%perPage != 0 {
		totalPages++
	}
	if totalPages < 1 {
		totalPages = 1
	}
	return adminCompanyListResponse{
		Companies:  companies,
		Total:      total,
		Page:       page,
		PerPage:    perPage,
		TotalPages: totalPages,
	}
}

func (c *AdminCompanyController) BypassLogin(ctx echo.Context, id string) error {
	parsed, err := uuid.Parse(id)
	if err != nil {
		return badRequest(ctx, "invalid company id")
	}
	pgID := pgtype.UUID{Bytes: parsed, Valid: true}

	ca, err := c.queries.GetCompanyAccountByID(ctx.Request().Context(), pgID)
	if err != nil {
		return notFoundError(ctx, "company not found")
	}

	companyID := pgUUIDToString(ca.ID)
	accessToken, err := c.jwtService.GenerateCompanyAccessToken(companyID)
	if err != nil {
		return internalError(ctx, "failed to generate token")
	}

	rawRefresh, err := c.jwtService.GenerateRefreshToken()
	if err != nil {
		return internalError(ctx, "failed to generate token")
	}

	if err := c.queries.CreateCompanyRefreshToken(ctx.Request().Context(), &generated.CreateCompanyRefreshTokenParams{
		CompanyID: ca.ID,
		TokenHash: c.jwtService.HashRefreshToken(rawRefresh),
		ExpiresAt: pgtype.Timestamptz{Time: time.Now().Add(7 * 24 * time.Hour), Valid: true},
	}); err != nil {
		return internalError(ctx, "failed to store refresh token")
	}

	setCompanyAuthCookies(ctx, &presenter.CompanyAuthTokenResponse{
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
	})

	return ctx.JSON(http.StatusOK, map[string]string{
		"message":     "ok",
		"companyName": ca.CompanyName,
	})
}
