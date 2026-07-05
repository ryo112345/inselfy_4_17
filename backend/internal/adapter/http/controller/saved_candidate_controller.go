package controller

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type SavedCandidateController struct {
	input port.SavedCandidateInputPort
}

func NewSavedCandidateController(input port.SavedCandidateInputPort) *SavedCandidateController {
	return &SavedCandidateController{input: input}
}

func (c *SavedCandidateController) Save(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)
	userID := ctx.Param("userId")
	if userID == "" {
		return badRequest(ctx, "userId is required")
	}

	if err := c.input.Save(ctx.Request().Context(), companyID, userID); err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *SavedCandidateController) Unsave(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)
	userID := ctx.Param("userId")

	if err := c.input.Unsave(ctx.Request().Context(), companyID, userID); err != nil {
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

	cards, total, err := c.input.List(ctx.Request().Context(), companyID, limit, offset)
	if err != nil {
		return internalError(ctx, err.Error())
	}

	return ctx.JSON(http.StatusOK, presenter.TalentListResponse(cards, total))
}

func (c *SavedCandidateController) IsSaved(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)
	userID := ctx.Param("userId")

	exists, err := c.input.IsSaved(ctx.Request().Context(), companyID, userID)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.JSON(http.StatusOK, openapi.ModelsSavedResponse{Saved: exists})
}

func (c *SavedCandidateController) BulkCheck(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	var body openapi.ModelsBulkCheckSavedRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}

	savedSet, err := c.input.SavedSet(ctx.Request().Context(), companyID, body.UserIds)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.JSON(http.StatusOK, openapi.ModelsBulkSavedResponse{Saved: savedSet})
}

func (c *SavedCandidateController) Count(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	count, err := c.input.Count(ctx.Request().Context(), companyID)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.JSON(http.StatusOK, openapi.ModelsSavedCountResponse{Count: count})
}
