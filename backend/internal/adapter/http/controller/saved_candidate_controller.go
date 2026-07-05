package controller

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/domain/talentsearch"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type SavedCandidateController struct {
	input port.SavedCandidateInputPort
}

func NewSavedCandidateController(input port.SavedCandidateInputPort) *SavedCandidateController {
	return &SavedCandidateController{input: input}
}

// toTalentCardResponse converts the read model into the shared talentCard
// JSON shape (defined in talent_search_controller.go).
func toTalentCardResponse(c talentsearch.Card) talentCard {
	exps := make([]talentExp, len(c.Experiences))
	for i, e := range c.Experiences {
		exps[i] = talentExp{CompanyName: e.CompanyName, Title: e.Title}
	}
	return talentCard{
		UserID:           c.UserID,
		Username:         c.Username,
		Name:             c.Name,
		Headline:         c.Headline,
		AvatarURL:        c.AvatarURL,
		ProfileColor:     c.ProfileColor,
		JobSeekingStatus: c.JobSeekingStatus,
		Skills:           c.Skills,
		Experiences:      exps,
		TopWVLabels:      c.TopWVLabels,
		TopCILabels:      c.TopCILabels,
		Similarity:       c.Similarity,
		WVSimilarity:     c.WVSimilarity,
		CISimilarity:     c.CISimilarity,
		IntSimilarity:    c.IntSimilarity,
	}
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

	users := make([]talentCard, len(cards))
	for i, card := range cards {
		users[i] = toTalentCardResponse(card)
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"users": users,
		"total": total,
	})
}

func (c *SavedCandidateController) IsSaved(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)
	userID := ctx.Param("userId")

	exists, err := c.input.IsSaved(ctx.Request().Context(), companyID, userID)
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

	savedSet, err := c.input.SavedSet(ctx.Request().Context(), companyID, body.UserIDs)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.JSON(http.StatusOK, map[string]any{"saved": savedSet})
}

func (c *SavedCandidateController) Count(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	count, err := c.input.Count(ctx.Request().Context(), companyID)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.JSON(http.StatusOK, map[string]int{"count": count})
}
