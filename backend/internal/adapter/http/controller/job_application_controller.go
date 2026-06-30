package controller

import (
	"context"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type JobApplicationController struct {
	inputFactory   func(repo port.JobApplicationRepository, jobRepo port.JobPostingRepository, output port.JobApplicationOutputPort) port.JobApplicationInputPort
	outputFactory  func() *presenter.JobApplicationPresenter
	repoFactory    func() port.JobApplicationRepository
	jobRepoFactory func() port.JobPostingRepository
	pool           *pgxpool.Pool
}

func NewJobApplicationController(
	inputFactory func(repo port.JobApplicationRepository, jobRepo port.JobPostingRepository, output port.JobApplicationOutputPort) port.JobApplicationInputPort,
	outputFactory func() *presenter.JobApplicationPresenter,
	repoFactory func() port.JobApplicationRepository,
	jobRepoFactory func() port.JobPostingRepository,
	pool *pgxpool.Pool,
) *JobApplicationController {
	return &JobApplicationController{
		inputFactory:   inputFactory,
		outputFactory:  outputFactory,
		repoFactory:    repoFactory,
		jobRepoFactory: jobRepoFactory,
		pool:           pool,
	}
}

func (c *JobApplicationController) newIO() (port.JobApplicationInputPort, *presenter.JobApplicationPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(c.repoFactory(), c.jobRepoFactory(), output)
	return input, output
}

type applyRequest struct {
	JobPostingID string `json:"jobPostingId"`
	Message      string `json:"message"`
}

type updateStatusRequest struct {
	Status string `json:"status"`
}

func (c *JobApplicationController) Apply(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	var body applyRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}
	if body.JobPostingID == "" {
		return badRequest(ctx, "jobPostingId is required")
	}

	input, p := c.newIO()
	if err := input.Apply(ctx.Request().Context(), jobapplication.ApplyInput{
		JobPostingID: body.JobPostingID,
		CandidateID:  userID,
		Message:      body.Message,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.SingleResponse())
}

func (c *JobApplicationController) ListByCompany(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	filter := jobapplication.ListFilter{}
	if s := ctx.QueryParam("status"); s != "" {
		filter.Status = &s
	}
	if jp := ctx.QueryParam("job_posting_id"); jp != "" {
		filter.JobPostingID = &jp
	}
	if kw := ctx.QueryParam("keyword"); kw != "" {
		filter.Keyword = &kw
	}
	if df := ctx.QueryParam("date_from"); df != "" {
		if t, err := time.Parse(time.RFC3339, df); err == nil {
			filter.DateFrom = &t
		}
	}
	if dt := ctx.QueryParam("date_to"); dt != "" {
		if t, err := time.Parse(time.RFC3339, dt); err == nil {
			filter.DateTo = &t
		}
	}
	filter.Limit, _ = strconv.Atoi(ctx.QueryParam("limit"))
	filter.Offset, _ = strconv.Atoi(ctx.QueryParam("offset"))

	input, p := c.newIO()
	if err := input.ListByCompany(ctx.Request().Context(), companyID, filter); err != nil {
		return handleError(ctx, err)
	}
	resp := p.ListResponse()
	c.enrichWithSimilarity(ctx.Request().Context(), companyID, resp.Items)
	return ctx.JSON(http.StatusOK, resp)
}

func (c *JobApplicationController) ListByCandidate(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	input, p := c.newIO()
	if err := input.ListByCandidate(ctx.Request().Context(), userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ListResponse())
}

func (c *JobApplicationController) GetByID(ctx echo.Context, applicationID string) error {
	companyID := authmw.CompanyID(ctx)

	input, p := c.newIO()
	if err := input.GetByID(ctx.Request().Context(), companyID, applicationID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.SingleResponse())
}

func (c *JobApplicationController) UpdateStatus(ctx echo.Context, applicationID string) error {
	companyID := authmw.CompanyID(ctx)

	var body updateStatusRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, p := c.newIO()
	if err := input.UpdateStatus(ctx.Request().Context(), companyID, applicationID, jobapplication.Status(body.Status)); err != nil {
		return handleError(ctx, err)
	}
	_ = p
	return ctx.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

func (c *JobApplicationController) Withdraw(ctx echo.Context, applicationID string) error {
	userID := authmw.UserID(ctx)

	input, p := c.newIO()
	if err := input.Withdraw(ctx.Request().Context(), userID, applicationID); err != nil {
		return handleError(ctx, err)
	}
	_ = p
	return ctx.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

func (c *JobApplicationController) CheckApplied(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	jobPostingID := ctx.QueryParam("jobPostingId")
	if jobPostingID == "" {
		return badRequest(ctx, "jobPostingId is required")
	}

	input, p := c.newIO()
	if err := input.CheckApplied(ctx.Request().Context(), userID, jobPostingID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.AppliedResponse())
}

const (
	appSigmaWV      = 18.0
	appSigmaCI      = 0.7
	appGeomeanFloor = 0.001
)

var appWVValueIDs = []string{"achievement", "comfort", "status", "altruism", "safety", "autonomy"}
var appCITypeIDs = [6]string{"R", "I", "A", "S", "E", "C"}
var appCITypeIdx = map[string]int{"R": 0, "I": 1, "A": 2, "S": 3, "E": 4, "C": 5}

func appGauss(diff, sigma float64) float64 {
	return math.Exp(-(diff * diff) / (2 * sigma * sigma))
}

func appGaussianWV(userScores, targetScores map[string]float64) float64 {
	var logSum, weightTotal float64
	for _, vid := range appWVValueIDs {
		u, uOk := userScores[vid]
		t, tOk := targetScores[vid]
		if !uOk || !tOk {
			continue
		}
		logSum += u * math.Log(appGauss(math.Abs(u-t), appSigmaWV)+appGeomeanFloor)
		weightTotal += u
	}
	if weightTotal == 0 {
		return 0
	}
	return math.Round(math.Exp(logSum/weightTotal)*1000) / 10
}

func appGaussianCI(userScores, targetScores [6]float64) float64 {
	var logSum float64
	count := 0
	for i := 0; i < 6; i++ {
		if userScores[i] == 0 && targetScores[i] == 0 {
			continue
		}
		logSum += math.Log(appGauss(math.Abs(userScores[i]-targetScores[i]), appSigmaCI) + appGeomeanFloor)
		count++
	}
	if count == 0 {
		return 0
	}
	return math.Round(math.Exp(logSum/float64(count))*1000) / 10
}

func (c *JobApplicationController) enrichWithSimilarity(ctx context.Context, companyID string, items []*presenter.JobApplicationResponse) {
	if len(items) == 0 || c.pool == nil {
		return
	}

	// Collect unique job posting IDs and candidate IDs
	jpIDs := map[string]bool{}
	candidateIDs := map[string]bool{}
	for _, item := range items {
		jpIDs[item.JobPostingID] = true
		candidateIDs[item.CandidateID] = true
	}

	// Get team_id for each job posting
	jpTeams := map[string]string{}
	{
		uuids := make([]pgtype.UUID, 0, len(jpIDs))
		for id := range jpIDs {
			uuids = append(uuids, pgUUID(id))
		}
		rows, err := c.pool.Query(ctx,
			`SELECT id, team_id FROM job_postings WHERE id = ANY($1) AND team_id IS NOT NULL`, uuids)
		if err == nil {
			for rows.Next() {
				var jpID, teamID pgtype.UUID
				if rows.Scan(&jpID, &teamID) == nil {
					jpTeams[pgUUIDToString(jpID)] = pgUUIDToString(teamID)
				}
			}
			rows.Close()
		}
	}
	if len(jpTeams) == 0 {
		return
	}

	// Get unique team IDs and verify ownership
	uniqueTeams := map[string]bool{}
	for _, tid := range jpTeams {
		uniqueTeams[tid] = true
	}

	// Get team average WV scores
	teamWV := map[string]map[string]float64{}
	teamCI := map[string][6]float64{}
	companyUUID := pgUUID(companyID)
	for tid := range uniqueTeams {
		teamUUID := pgUUID(tid)

		// Verify ownership
		var ownerID pgtype.UUID
		if err := c.pool.QueryRow(ctx, `SELECT company_id FROM teams WHERE id = $1`, teamUUID).Scan(&ownerID); err != nil {
			continue
		}
		if pgUUIDToString(ownerID) != pgUUIDToString(companyUUID) {
			continue
		}

		// WV averages
		wvRows, err := c.pool.Query(ctx,
			`SELECT ws.value_id, AVG(ws.display_score) AS avg_score
			FROM work_values_scores ws
			JOIN (
				SELECT DISTINCT ON (s.user_id) s.id AS session_id
				FROM work_values_sessions s
				JOIN team_members tm ON tm.user_id = s.user_id
				WHERE tm.team_id = $1 AND tm.wv_status = 'completed' AND s.status = 'completed'
				ORDER BY s.user_id, s.completed_at DESC
			) latest ON ws.session_id = latest.session_id
			GROUP BY ws.value_id`, teamUUID)
		if err == nil {
			scores := make(map[string]float64)
			for wvRows.Next() {
				var vid string
				var avg float64
				if wvRows.Scan(&vid, &avg) == nil {
					scores[vid] = avg
				}
			}
			wvRows.Close()
			if len(scores) > 0 {
				teamWV[tid] = scores
			}
		}

		// CI averages
		ciRows, err := c.pool.Query(ctx,
			`SELECT ts.type_id, AVG(ts.score) AS avg_score
			FROM career_interest_type_scores ts
			JOIN (
				SELECT DISTINCT ON (s.user_id) s.id AS session_id
				FROM career_interest_sessions s
				JOIN team_members tm ON tm.user_id = s.user_id
				WHERE tm.team_id = $1 AND tm.ci_status = 'completed' AND s.status = 'completed'
				ORDER BY s.user_id, s.completed_at DESC
			) latest ON ts.session_id = latest.session_id
			GROUP BY ts.type_id`, teamUUID)
		if err == nil {
			var scores [6]float64
			count := 0
			for ciRows.Next() {
				var tid string
				var avg float64
				if ciRows.Scan(&tid, &avg) == nil {
					if idx, ok := appCITypeIdx[tid]; ok {
						scores[idx] = avg
						count++
					}
				}
			}
			ciRows.Close()
			if count > 0 {
				teamCI[tid] = scores
			}
		}
	}

	if len(teamWV) == 0 && len(teamCI) == 0 {
		return
	}

	// Get candidate WV scores
	candidateUUIDs := make([]pgtype.UUID, 0, len(candidateIDs))
	for id := range candidateIDs {
		candidateUUIDs = append(candidateUUIDs, pgUUID(id))
	}

	candidateWV := map[string]map[string]float64{}
	{
		rows2, err := c.pool.Query(ctx,
			`SELECT s.user_id, ws.value_id, ws.display_score
			FROM work_values_scores ws
			JOIN (
				SELECT DISTINCT ON (user_id) id, user_id
				FROM work_values_sessions
				WHERE user_id = ANY($1) AND status = 'completed'
				ORDER BY user_id, completed_at DESC
			) s ON ws.session_id = s.id`, candidateUUIDs)
		if err == nil {
			for rows2.Next() {
				var uid pgtype.UUID
				var vid string
				var ds float64
				if rows2.Scan(&uid, &vid, &ds) == nil {
					uidStr := pgUUIDToString(uid)
					if candidateWV[uidStr] == nil {
						candidateWV[uidStr] = make(map[string]float64)
					}
					candidateWV[uidStr][vid] = ds
				}
			}
			rows2.Close()
		}
	}

	candidateCI := map[string][6]float64{}
	{
		rows, err := c.pool.Query(ctx,
			`SELECT s.user_id, ts.type_id, ts.score
			FROM career_interest_type_scores ts
			JOIN (
				SELECT DISTINCT ON (user_id) id, user_id
				FROM career_interest_sessions
				WHERE user_id = ANY($1) AND status = 'completed'
				ORDER BY user_id, completed_at DESC
			) s ON ts.session_id = s.id`, candidateUUIDs)
		if err == nil {
			for rows.Next() {
				var uid pgtype.UUID
				var tid string
				var score float64
				if rows.Scan(&uid, &tid, &score) == nil {
					uidStr := pgUUIDToString(uid)
					scores := candidateCI[uidStr]
					if idx, ok := appCITypeIdx[tid]; ok {
						scores[idx] = score
					}
					candidateCI[uidStr] = scores
				}
			}
			rows.Close()
		}
	}

	// Compute similarities
	for _, item := range items {
		teamID, ok := jpTeams[item.JobPostingID]
		if !ok {
			continue
		}

		if twv, ok := teamWV[teamID]; ok {
			if cwv, ok := candidateWV[item.CandidateID]; ok {
				sim := appGaussianWV(cwv, twv)
				item.WVSimilarity = &sim
			}
		}

		if tci, ok := teamCI[teamID]; ok {
			if cci, ok := candidateCI[item.CandidateID]; ok {
				sim := appGaussianCI(cci, tci)
				item.CISimilarity = &sim
			}
		}

		if item.WVSimilarity != nil && item.CISimilarity != nil {
			avg := math.Round((*item.WVSimilarity+*item.CISimilarity)/2.0*10) / 10
			item.IntSimilarity = &avg
		}
	}
}
