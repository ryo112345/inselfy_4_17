package controller

import (
	"context"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/talentsearch"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type TalentSearchController struct {
	input port.TalentSearchInputPort
}

func NewTalentSearchController(input port.TalentSearchInputPort) *TalentSearchController {
	return &TalentSearchController{input: input}
}

func talentSearchPage(limitParam, offsetParam *int32) (limit, offset int) {
	limit = derefInt32(limitParam)
	if limit < 1 || limit > 200 {
		limit = 20
	}
	offset = derefInt32(offsetParam)
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}

// conditionFilter builds the shared search filter from the typed query params.
func conditionFilter(q, location, industry, jobSeekingStatus, jobType, diagnosed, skills *string) talentsearch.Filter {
	deref := func(p *string) string {
		if p == nil {
			return ""
		}
		return *p
	}
	f := talentsearch.Filter{
		Keyword:          deref(q),
		Location:         deref(location),
		Industry:         deref(industry),
		JobSeekingStatus: deref(jobSeekingStatus),
		JobType:          deref(jobType),
		DiagnosedOnly:    deref(diagnosed) == "1",
	}
	if skillsParam := deref(skills); skillsParam != "" {
		for _, s := range strings.Split(skillsParam, ",") {
			if s = strings.TrimSpace(s); s != "" {
				f.Skills = append(f.Skills, s)
			}
		}
	}
	return f
}

// カスタム比重（wv_<valueId> / ci_<typeId>）は動的なクエリパラメータで
// スペックには載せていない（validator は未知クエリを素通しする）。
// strict の typed params にも現れないため、context 経由の生リクエストから読む。

func parseCustomWVDisplayScores(query url.Values) map[string]float64 {
	scores := make(map[string]float64)
	hasAny := false
	for _, vid := range talentsearch.WVValueIDs {
		if param := query.Get("wv_" + vid); param != "" {
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

func parseCustomCIWeights(query url.Values) *[6]float64 {
	var scores [6]float64
	hasAny := false
	for i, tid := range talentsearch.CITypeIDs {
		if param := query.Get("ci_" + tid); param != "" {
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

func rawQuery(ctx context.Context) url.Values {
	if r := requestFromContext(ctx); r != nil {
		return r.URL.Query()
	}
	return url.Values{}
}

func diagnosticSearchInput(ctx context.Context, teamID *string, q, location, industry, jobSeekingStatus, jobType, diagnosed, skills *string, limitParam, offsetParam *int32) talentsearch.DiagnosticSearchInput {
	limit, offset := talentSearchPage(limitParam, offsetParam)
	query := rawQuery(ctx)
	tid := ""
	if teamID != nil {
		tid = *teamID
	}
	return talentsearch.DiagnosticSearchInput{
		CompanyID: authmw.CompanyIDFromContext(ctx),
		TeamID:    tid,
		Filter:    conditionFilter(q, location, industry, jobSeekingStatus, jobType, diagnosed, skills),
		CustomWV:  parseCustomWVDisplayScores(query),
		CustomCI:  parseCustomCIWeights(query),
		Limit:     limit,
		Offset:    offset,
	}
}

// Search handles GET /api/company/talents/search.
func (c *TalentSearchController) Search(ctx context.Context, req openapi.TalentSearchSearchTalentsRequestObject) (openapi.TalentSearchSearchTalentsResponseObject, error) {
	p := req.Params
	limit, offset := talentSearchPage(p.Limit, p.Offset)
	filter := conditionFilter(p.Q, p.Location, p.Industry, p.JobSeekingStatus, p.JobType, p.Diagnosed, p.Skills)

	cards, total, err := c.input.Search(ctx, filter, limit, offset)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.TalentSearchSearchTalents400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.TalentSearchSearchTalents200JSONResponse(*presenter.TalentListResponse(cards, total)), nil
}

// DiagnosticSearch handles GET /api/company/talents/search/diagnostic.
func (c *TalentSearchController) DiagnosticSearch(ctx context.Context, req openapi.TalentSearchDiagnosticSearchTalentsRequestObject) (openapi.TalentSearchDiagnosticSearchTalentsResponseObject, error) {
	p := req.Params
	input := diagnosticSearchInput(ctx, p.TeamId, p.Q, p.Location, p.Industry, p.JobSeekingStatus, p.JobType, p.Diagnosed, p.Skills, p.Limit, p.Offset)

	cards, total, err := c.input.DiagnosticSearch(ctx, input)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.TalentSearchDiagnosticSearchTalents400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.TalentSearchDiagnosticSearchTalents200JSONResponse(*presenter.TalentListResponse(cards, total)), nil
}

// CIDiagnosticSearch handles GET /api/company/talents/search/diagnostic/ci.
func (c *TalentSearchController) CIDiagnosticSearch(ctx context.Context, req openapi.TalentSearchCiDiagnosticSearchTalentsRequestObject) (openapi.TalentSearchCiDiagnosticSearchTalentsResponseObject, error) {
	p := req.Params
	input := diagnosticSearchInput(ctx, p.TeamId, p.Q, p.Location, p.Industry, p.JobSeekingStatus, p.JobType, p.Diagnosed, p.Skills, p.Limit, p.Offset)

	cards, total, err := c.input.CIDiagnosticSearch(ctx, input)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.TalentSearchCiDiagnosticSearchTalents400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.TalentSearchCiDiagnosticSearchTalents200JSONResponse(*presenter.TalentListResponse(cards, total)), nil
}

// IntegratedDiagnosticSearch handles GET /api/company/talents/search/diagnostic/integrated.
func (c *TalentSearchController) IntegratedDiagnosticSearch(ctx context.Context, req openapi.TalentSearchIntegratedDiagnosticSearchTalentsRequestObject) (openapi.TalentSearchIntegratedDiagnosticSearchTalentsResponseObject, error) {
	p := req.Params
	input := diagnosticSearchInput(ctx, p.TeamId, p.Q, p.Location, p.Industry, p.JobSeekingStatus, p.JobType, p.Diagnosed, p.Skills, p.Limit, p.Offset)

	cards, total, err := c.input.IntegratedDiagnosticSearch(ctx, input)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.TalentSearchIntegratedDiagnosticSearchTalents400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.TalentSearchIntegratedDiagnosticSearchTalents200JSONResponse(*presenter.TalentListResponse(cards, total)), nil
}
