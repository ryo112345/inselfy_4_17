package controller

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/domain/talentsearch"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type TalentSearchController struct {
	input port.TalentSearchInputPort
}

func NewTalentSearchController(input port.TalentSearchInputPort) *TalentSearchController {
	return &TalentSearchController{input: input}
}

type talentCard struct {
	UserID           string      `json:"user_id"`
	Username         string      `json:"username"`
	Name             string      `json:"name"`
	Headline         *string     `json:"headline"`
	AvatarURL        *string     `json:"avatar_url"`
	ProfileColor     *string     `json:"profile_color"`
	JobSeekingStatus *string     `json:"job_seeking_status"`
	Skills           []string    `json:"skills"`
	Experiences      []talentExp `json:"experiences"`
	TopWVLabels      []string    `json:"top_wv_labels"`
	TopCILabels      []string    `json:"top_ci_labels"`
	Similarity       *float64    `json:"similarity,omitempty"`
	WVSimilarity     *float64    `json:"wv_similarity,omitempty"`
	CISimilarity     *float64    `json:"ci_similarity,omitempty"`
	IntSimilarity    *float64    `json:"integrated_similarity,omitempty"`
}

type talentExp struct {
	CompanyName string `json:"company_name"`
	Title       string `json:"title"`
}

func talentSearchPage(ctx echo.Context) (limit, offset int) {
	limit, _ = strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ = strconv.Atoi(ctx.QueryParam("offset"))
	if limit < 1 || limit > 200 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}

func parseConditionFilter(ctx echo.Context) talentsearch.Filter {
	f := talentsearch.Filter{
		Keyword:          ctx.QueryParam("q"),
		Location:         ctx.QueryParam("location"),
		Industry:         ctx.QueryParam("industry"),
		JobSeekingStatus: ctx.QueryParam("job_seeking_status"),
		JobType:          ctx.QueryParam("job_type"),
		DiagnosedOnly:    ctx.QueryParam("diagnosed") == "1",
	}
	if skillsParam := ctx.QueryParam("skills"); skillsParam != "" {
		for _, s := range strings.Split(skillsParam, ",") {
			if s = strings.TrimSpace(s); s != "" {
				f.Skills = append(f.Skills, s)
			}
		}
	}
	return f
}

func parseCustomWVDisplayScores(ctx echo.Context) map[string]float64 {
	scores := make(map[string]float64)
	hasAny := false
	for _, vid := range talentsearch.WVValueIDs {
		if param := ctx.QueryParam("wv_" + vid); param != "" {
			if v, err := strconv.ParseFloat(param, 64); err == nil {
				scores[vid] = v
				hasAny = true
			}
		}
	}
	if !hasAny {
		return nil
	}
	return scores
}

func parseCustomCIWeights(ctx echo.Context) *[6]float64 {
	var scores [6]float64
	hasAny := false
	for i, tid := range talentsearch.CITypeIDs {
		if param := ctx.QueryParam("ci_" + tid); param != "" {
			if v, err := strconv.ParseFloat(param, 64); err == nil {
				scores[i] = v
				hasAny = true
			}
		}
	}
	if !hasAny {
		return nil
	}
	return &scores
}

func talentCardListResponse(ctx echo.Context, cards []talentsearch.Card, total int) error {
	users := make([]talentCard, len(cards))
	for i, card := range cards {
		users[i] = toTalentCardResponse(card)
	}
	return ctx.JSON(http.StatusOK, map[string]any{
		"users": users,
		"total": total,
	})
}

func diagnosticSearchInput(ctx echo.Context) talentsearch.DiagnosticSearchInput {
	limit, offset := talentSearchPage(ctx)
	return talentsearch.DiagnosticSearchInput{
		CompanyID: authmw.CompanyID(ctx),
		TeamID:    ctx.QueryParam("team_id"),
		Filter:    parseConditionFilter(ctx),
		CustomWV:  parseCustomWVDisplayScores(ctx),
		CustomCI:  parseCustomCIWeights(ctx),
		Limit:     limit,
		Offset:    offset,
	}
}

func (c *TalentSearchController) Search(ctx echo.Context) error {
	limit, offset := talentSearchPage(ctx)
	cards, total, err := c.input.Search(ctx.Request().Context(), parseConditionFilter(ctx), limit, offset)
	if err != nil {
		return handleError(ctx, err)
	}
	return talentCardListResponse(ctx, cards, total)
}

func (c *TalentSearchController) DiagnosticSearch(ctx echo.Context) error {
	cards, total, err := c.input.DiagnosticSearch(ctx.Request().Context(), diagnosticSearchInput(ctx))
	if err != nil {
		return handleError(ctx, err)
	}
	return talentCardListResponse(ctx, cards, total)
}

func (c *TalentSearchController) CIDiagnosticSearch(ctx echo.Context) error {
	cards, total, err := c.input.CIDiagnosticSearch(ctx.Request().Context(), diagnosticSearchInput(ctx))
	if err != nil {
		return handleError(ctx, err)
	}
	return talentCardListResponse(ctx, cards, total)
}

func (c *TalentSearchController) IntegratedDiagnosticSearch(ctx echo.Context) error {
	cards, total, err := c.input.IntegratedDiagnosticSearch(ctx.Request().Context(), diagnosticSearchInput(ctx))
	if err != nil {
		return handleError(ctx, err)
	}
	return talentCardListResponse(ctx, cards, total)
}
