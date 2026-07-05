package controller

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type SimilarUsersController struct {
	input port.SimilarUsersInputPort
}

func NewSimilarUsersController(input port.SimilarUsersInputPort) *SimilarUsersController {
	return &SimilarUsersController{input: input}
}

type similarUserExperience struct {
	CompanyName string `json:"company_name"`
	Title       string `json:"title"`
	IsCurrent   bool   `json:"is_current"`
}

type similarUserItem struct {
	UserID       string                  `json:"user_id"`
	Username     string                  `json:"username"`
	Name         string                  `json:"name"`
	Headline     *string                 `json:"headline"`
	AvatarURL    *string                 `json:"avatar_url"`
	ProfileColor *string                 `json:"profile_color"`
	Similarity   float64                 `json:"similarity"`
	TopNeeds     []string                `json:"top_needs"`
	Experiences  []similarUserExperience `json:"experiences"`
}

func (c *SimilarUsersController) GetSimilarUsers(ctx echo.Context, userID string) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	if limit < 1 || limit > 50 {
		limit = 10
	}

	users, err := c.input.GetSimilarUsers(ctx.Request().Context(), userID, limit)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return notFoundError(ctx, "user has no work values result")
		}
		return internalError(ctx, err.Error())
	}

	var candidates []similarUserItem
	for _, u := range users {
		candidates = append(candidates, toSimilarUserItem(u))
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"users": candidates,
		"total": len(candidates),
	})
}

func toSimilarUserItem(u workvalues.SimilarUser) similarUserItem {
	item := similarUserItem{
		UserID:       u.UserID,
		Username:     u.Username,
		Name:         u.Name,
		Headline:     u.Headline,
		AvatarURL:    u.AvatarURL,
		ProfileColor: u.ProfileColor,
		Similarity:   u.Similarity,
		TopNeeds:     u.TopNeeds,
	}
	if u.Experiences != nil {
		item.Experiences = make([]similarUserExperience, len(u.Experiences))
		for i, e := range u.Experiences {
			item.Experiences[i] = similarUserExperience{
				CompanyName: e.CompanyName,
				Title:       e.Title,
				IsCurrent:   e.IsCurrent,
			}
		}
	}
	return item
}
