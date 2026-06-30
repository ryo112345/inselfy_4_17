package controller

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
)

type CompanyTeamController struct {
	pool *pgxpool.Pool
}

func NewCompanyTeamController(pool *pgxpool.Pool) *CompanyTeamController {
	return &CompanyTeamController{pool: pool}
}

type teamResponse struct {
	ID          string  `json:"id"`
	CompanyID   string  `json:"company_id"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	IsPublic    bool    `json:"is_public"`
	MemberCount int     `json:"member_count"`
	WVCompleted int     `json:"wv_completed"`
	CICompleted int     `json:"ci_completed"`
	CreatedAt   string  `json:"created_at"`
}

type memberResponse struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Email       *string `json:"email"`
	InviteToken string  `json:"invite_token"`
	WVStatus    string  `json:"wv_status"`
	CIStatus    string  `json:"ci_status"`
	IsAce       bool    `json:"is_ace"`
	CreatedAt   string  `json:"created_at"`
}

type teamDetailResponse struct {
	ID          string           `json:"id"`
	CompanyID   string           `json:"company_id"`
	Name        string           `json:"name"`
	Description *string          `json:"description"`
	IsPublic    bool             `json:"is_public"`
	Members     []memberResponse `json:"members"`
	CreatedAt   string           `json:"created_at"`
}

func (c *CompanyTeamController) companyID(ctx echo.Context) string {
	return ctx.Get(authmw.CompanyIDKey).(string)
}

func (c *CompanyTeamController) ListTeams(ctx echo.Context) error {
	companyID := c.companyID(ctx)
	parsed, err := uuid.Parse(companyID)
	if err != nil {
		return badRequest(ctx, "invalid company id")
	}

	rows, err := c.pool.Query(ctx.Request().Context(),
		`SELECT t.id, t.company_id, t.name, t.description, t.is_public, t.created_at,
			COUNT(tm.id) AS member_count,
			COUNT(CASE WHEN tm.wv_status = 'completed' THEN 1 END) AS wv_completed,
			COUNT(CASE WHEN tm.ci_status = 'completed' THEN 1 END) AS ci_completed
		 FROM teams t
		 LEFT JOIN team_members tm ON tm.team_id = t.id
		 WHERE t.company_id = $1
		 GROUP BY t.id
		 ORDER BY t.created_at DESC`, parsed)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	defer rows.Close()

	teams := []teamResponse{}
	for rows.Next() {
		var t teamResponse
		var id, cid uuid.UUID
		var desc *string
		var createdAt time.Time
		if err := rows.Scan(&id, &cid, &t.Name, &desc, &t.IsPublic, &createdAt, &t.MemberCount, &t.WVCompleted, &t.CICompleted); err != nil {
			return internalError(ctx, err.Error())
		}
		t.ID = id.String()
		t.CompanyID = cid.String()
		t.Description = desc
		t.CreatedAt = createdAt.Format(time.RFC3339)
		teams = append(teams, t)
	}

	return ctx.JSON(http.StatusOK, map[string]any{"teams": teams})
}

func (c *CompanyTeamController) CreateTeam(ctx echo.Context) error {
	companyID := c.companyID(ctx)
	parsedCompanyID, err := uuid.Parse(companyID)
	if err != nil {
		return badRequest(ctx, "invalid company id")
	}

	var body struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
	}
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request")
	}
	if body.Name == "" || len(body.Name) > 100 {
		return badRequest(ctx, "name is required (max 100 chars)")
	}

	var id uuid.UUID
	var createdAt time.Time
	err = c.pool.QueryRow(ctx.Request().Context(),
		`INSERT INTO teams (company_id, name, description) VALUES ($1, $2, $3) RETURNING id, created_at`,
		parsedCompanyID, body.Name, body.Description,
	).Scan(&id, &createdAt)
	if err != nil {
		return internalError(ctx, err.Error())
	}

	return ctx.JSON(http.StatusCreated, teamDetailResponse{
		ID:          id.String(),
		CompanyID:   companyID,
		Name:        body.Name,
		Description: body.Description,
		Members:     []memberResponse{},
		CreatedAt:   createdAt.Format(time.RFC3339),
	})
}

func (c *CompanyTeamController) GetTeam(ctx echo.Context, teamID string) error {
	companyID := c.companyID(ctx)

	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return badRequest(ctx, "invalid team id")
	}

	var team teamDetailResponse
	var tid, cid uuid.UUID
	var createdAt time.Time
	err = c.pool.QueryRow(ctx.Request().Context(),
		`SELECT id, company_id, name, description, is_public, created_at FROM teams WHERE id = $1 AND company_id = $2`,
		parsedTeamID, companyID,
	).Scan(&tid, &cid, &team.Name, &team.Description, &team.IsPublic, &createdAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return notFoundError(ctx, "team not found")
		}
		return internalError(ctx, err.Error())
	}
	team.ID = tid.String()
	team.CompanyID = cid.String()
	team.CreatedAt = createdAt.Format(time.RFC3339)

	memberRows, err := c.pool.Query(ctx.Request().Context(),
		`SELECT id, name, email, invite_token, wv_status, ci_status, is_ace, created_at
		 FROM team_members WHERE team_id = $1 ORDER BY created_at ASC`, parsedTeamID)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	defer memberRows.Close()

	members := []memberResponse{}
	for memberRows.Next() {
		var m memberResponse
		var mid uuid.UUID
		var email *string
		var mCreatedAt time.Time
		if err := memberRows.Scan(&mid, &m.Name, &email, &m.InviteToken, &m.WVStatus, &m.CIStatus, &m.IsAce, &mCreatedAt); err != nil {
			return internalError(ctx, err.Error())
		}
		m.ID = mid.String()
		m.Email = email
		m.CreatedAt = mCreatedAt.Format(time.RFC3339)
		members = append(members, m)
	}
	team.Members = members

	return ctx.JSON(http.StatusOK, team)
}

func (c *CompanyTeamController) UpdateTeam(ctx echo.Context, teamID string) error {
	companyID := c.companyID(ctx)
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return badRequest(ctx, "invalid team id")
	}

	var body struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
		IsPublic    *bool   `json:"is_public"`
	}
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request")
	}
	if body.Name == "" || len(body.Name) > 100 {
		return badRequest(ctx, "name is required (max 100 chars)")
	}

	var tag pgconn.CommandTag
	if body.IsPublic != nil {
		tag, err = c.pool.Exec(ctx.Request().Context(),
			`UPDATE teams SET name = $1, description = $2, is_public = $3, updated_at = NOW() WHERE id = $4 AND company_id = $5`,
			body.Name, body.Description, *body.IsPublic, parsedTeamID, companyID,
		)
	} else {
		tag, err = c.pool.Exec(ctx.Request().Context(),
			`UPDATE teams SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 AND company_id = $4`,
			body.Name, body.Description, parsedTeamID, companyID,
		)
	}
	if err != nil {
		return internalError(ctx, err.Error())
	}
	if tag.RowsAffected() == 0 {
		return notFoundError(ctx, "team not found")
	}

	return ctx.NoContent(http.StatusNoContent)
}

func (c *CompanyTeamController) DeleteTeam(ctx echo.Context, teamID string) error {
	companyID := c.companyID(ctx)
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return badRequest(ctx, "invalid team id")
	}

	tag, err := c.pool.Exec(ctx.Request().Context(),
		`DELETE FROM teams WHERE id = $1 AND company_id = $2`,
		parsedTeamID, companyID,
	)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	if tag.RowsAffected() == 0 {
		return notFoundError(ctx, "team not found")
	}

	return ctx.NoContent(http.StatusNoContent)
}

func (c *CompanyTeamController) AddMember(ctx echo.Context, teamID string) error {
	companyID := c.companyID(ctx)
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return badRequest(ctx, "invalid team id")
	}

	// Verify team belongs to this company
	var ownerID string
	err = c.pool.QueryRow(ctx.Request().Context(),
		`SELECT company_id FROM teams WHERE id = $1`, parsedTeamID,
	).Scan(&ownerID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return notFoundError(ctx, "team not found")
		}
		return internalError(ctx, err.Error())
	}
	if ownerID != companyID {
		return forbidden(ctx, "not your team")
	}

	// Check member count limit (30)
	var memberCount int
	err = c.pool.QueryRow(ctx.Request().Context(),
		`SELECT COUNT(*) FROM team_members WHERE team_id = $1`, parsedTeamID,
	).Scan(&memberCount)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	if memberCount >= 30 {
		return badRequest(ctx, "チームメンバーは最大30人までです")
	}

	var body struct {
		Name  string  `json:"name"`
		Email *string `json:"email"`
	}
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request")
	}
	if body.Name == "" || len(body.Name) > 100 {
		return badRequest(ctx, "name is required (max 100 chars)")
	}

	reqCtx := ctx.Request().Context()

	// Create a users record for this team member
	userID, err := c.createTeamMemberUser(reqCtx, body.Name)
	if err != nil {
		return internalError(ctx, err.Error())
	}

	token, err := generateInviteToken()
	if err != nil {
		return internalError(ctx, err.Error())
	}

	var memberID uuid.UUID
	var createdAt time.Time
	err = c.pool.QueryRow(reqCtx,
		`INSERT INTO team_members (team_id, user_id, name, email, invite_token)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
		parsedTeamID, userID, body.Name, body.Email, token,
	).Scan(&memberID, &createdAt)
	if err != nil {
		return internalError(ctx, err.Error())
	}

	return ctx.JSON(http.StatusCreated, memberResponse{
		ID:          memberID.String(),
		Name:        body.Name,
		Email:       body.Email,
		InviteToken: token,
		WVStatus:    "pending",
		CIStatus:    "pending",
		CreatedAt:   createdAt.Format(time.RFC3339),
	})
}

func (c *CompanyTeamController) RemoveMember(ctx echo.Context, teamID, memberID string) error {
	companyID := c.companyID(ctx)
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return badRequest(ctx, "invalid team id")
	}
	parsedMemberID, err := uuid.Parse(memberID)
	if err != nil {
		return badRequest(ctx, "invalid member id")
	}

	// Verify team belongs to this company
	var ownerID string
	err = c.pool.QueryRow(ctx.Request().Context(),
		`SELECT company_id FROM teams WHERE id = $1`, parsedTeamID,
	).Scan(&ownerID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return notFoundError(ctx, "team not found")
		}
		return internalError(ctx, err.Error())
	}
	if ownerID != companyID {
		return forbidden(ctx, "not your team")
	}

	// Get user_id before deleting member (to clean up the user record)
	var userID uuid.UUID
	err = c.pool.QueryRow(ctx.Request().Context(),
		`SELECT user_id FROM team_members WHERE id = $1 AND team_id = $2`, parsedMemberID, parsedTeamID,
	).Scan(&userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return notFoundError(ctx, "member not found")
		}
		return internalError(ctx, err.Error())
	}

	// Delete member (cascades from team_members)
	_, err = c.pool.Exec(ctx.Request().Context(),
		`DELETE FROM team_members WHERE id = $1 AND team_id = $2`, parsedMemberID, parsedTeamID,
	)
	if err != nil {
		return internalError(ctx, err.Error())
	}

	// Clean up the auto-created user record
	_, _ = c.pool.Exec(ctx.Request().Context(),
		`DELETE FROM users WHERE id = $1 AND username LIKE 'tm_%'`, userID,
	)

	return ctx.NoContent(http.StatusNoContent)
}

func (c *CompanyTeamController) createTeamMemberUser(ctx context.Context, name string) (uuid.UUID, error) {
	username := fmt.Sprintf("tm_%s", generateRandomString(12))
	var userID uuid.UUID
	err := c.pool.QueryRow(ctx,
		`INSERT INTO users (username, name) VALUES ($1, $2) RETURNING id`,
		username, name,
	).Scan(&userID)
	if err != nil {
		return uuid.UUID{}, err
	}
	return userID, nil
}

func generateInviteToken() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func generateRandomString(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)[:n]
}

type memberScoreResponse struct {
	MemberID   string  `json:"member_id"`
	MemberName string  `json:"member_name"`
	UserID     string  `json:"user_id"`
	WVStatus   string  `json:"wv_status"`
	CIStatus   string  `json:"ci_status"`
	IsAce      bool    `json:"is_ace"`
	WVScores   []score `json:"wv_scores,omitempty"`
	CIScores   []score `json:"ci_scores,omitempty"`
}

type score struct {
	ID           string  `json:"id"`
	DisplayScore float64 `json:"display_score"`
	Rank         int     `json:"rank"`
}

func (c *CompanyTeamController) GetTeamScores(ctx echo.Context, teamID string) error {
	companyID := c.companyID(ctx)
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return badRequest(ctx, "invalid team id")
	}

	var ownerID string
	err = c.pool.QueryRow(ctx.Request().Context(),
		`SELECT company_id FROM teams WHERE id = $1`, parsedTeamID,
	).Scan(&ownerID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return notFoundError(ctx, "team not found")
		}
		return internalError(ctx, err.Error())
	}
	if ownerID != companyID {
		return forbidden(ctx, "not your team")
	}

	reqCtx := ctx.Request().Context()

	memberRows, err := c.pool.Query(reqCtx,
		`SELECT id, user_id, name, wv_status, ci_status, is_ace FROM team_members WHERE team_id = $1 ORDER BY created_at ASC`,
		parsedTeamID)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	defer memberRows.Close()

	type memberInfo struct {
		id       uuid.UUID
		userID   uuid.UUID
		name     string
		wvStatus string
		ciStatus string
		isAce    bool
	}
	var members []memberInfo
	for memberRows.Next() {
		var m memberInfo
		if err := memberRows.Scan(&m.id, &m.userID, &m.name, &m.wvStatus, &m.ciStatus, &m.isAce); err != nil {
			return internalError(ctx, err.Error())
		}
		members = append(members, m)
	}

	result := make([]memberScoreResponse, 0, len(members))
	for _, m := range members {
		msr := memberScoreResponse{
			MemberID:   m.id.String(),
			MemberName: m.name,
			UserID:     m.userID.String(),
			WVStatus:   m.wvStatus,
			CIStatus:   m.ciStatus,
			IsAce:      m.isAce,
		}

		if m.wvStatus == "completed" {
			wvRows, err := c.pool.Query(reqCtx,
				`SELECT ws.value_id, ws.display_score, ws.rank
				 FROM work_values_scores ws
				 JOIN work_values_sessions s ON s.id = ws.session_id
				 WHERE s.user_id = $1 AND s.status = 'completed'
				 ORDER BY s.completed_at DESC`, m.userID)
			if err == nil {
				seen := map[string]bool{}
				for wvRows.Next() {
					var sc score
					if err := wvRows.Scan(&sc.ID, &sc.DisplayScore, &sc.Rank); err == nil {
						if !seen[sc.ID] {
							seen[sc.ID] = true
							msr.WVScores = append(msr.WVScores, sc)
						}
					}
				}
				wvRows.Close()
			}
		}

		if m.ciStatus == "completed" {
			ciRows, err := c.pool.Query(reqCtx,
				`SELECT ts.type_id, ts.score, ts.rank
				 FROM career_interest_type_scores ts
				 JOIN career_interest_sessions s ON s.id = ts.session_id
				 WHERE s.user_id = $1 AND s.status = 'completed'
				 ORDER BY s.completed_at DESC`, m.userID)
			if err == nil {
				seen := map[string]bool{}
				for ciRows.Next() {
					var sc score
					if err := ciRows.Scan(&sc.ID, &sc.DisplayScore, &sc.Rank); err == nil {
						if !seen[sc.ID] {
							seen[sc.ID] = true
							msr.CIScores = append(msr.CIScores, sc)
						}
					}
				}
				ciRows.Close()
			}
		}

		result = append(result, msr)
	}

	return ctx.JSON(http.StatusOK, map[string]any{"members": result})
}

func (c *CompanyTeamController) SetAceMember(ctx echo.Context, teamID, memberID string) error {
	companyID := c.companyID(ctx)
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return badRequest(ctx, "invalid team id")
	}
	parsedMemberID, err := uuid.Parse(memberID)
	if err != nil {
		return badRequest(ctx, "invalid member id")
	}

	var ownerID string
	err = c.pool.QueryRow(ctx.Request().Context(),
		`SELECT company_id FROM teams WHERE id = $1`, parsedTeamID,
	).Scan(&ownerID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return notFoundError(ctx, "team not found")
		}
		return internalError(ctx, err.Error())
	}
	if ownerID != companyID {
		return forbidden(ctx, "not your team")
	}

	reqCtx := ctx.Request().Context()
	tx, err := c.pool.Begin(reqCtx)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	defer tx.Rollback(reqCtx)

	_, err = tx.Exec(reqCtx,
		`UPDATE team_members SET is_ace = FALSE, updated_at = NOW() WHERE team_id = $1 AND is_ace = TRUE`,
		parsedTeamID)
	if err != nil {
		return internalError(ctx, err.Error())
	}

	tag, err := tx.Exec(reqCtx,
		`UPDATE team_members SET is_ace = TRUE, updated_at = NOW() WHERE id = $1 AND team_id = $2`,
		parsedMemberID, parsedTeamID)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	if tag.RowsAffected() == 0 {
		return notFoundError(ctx, "member not found")
	}

	if err := tx.Commit(reqCtx); err != nil {
		return internalError(ctx, err.Error())
	}

	return ctx.NoContent(http.StatusNoContent)
}

func (c *CompanyTeamController) UnsetAceMember(ctx echo.Context, teamID string) error {
	companyID := c.companyID(ctx)
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return badRequest(ctx, "invalid team id")
	}

	var ownerID string
	err = c.pool.QueryRow(ctx.Request().Context(),
		`SELECT company_id FROM teams WHERE id = $1`, parsedTeamID,
	).Scan(&ownerID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return notFoundError(ctx, "team not found")
		}
		return internalError(ctx, err.Error())
	}
	if ownerID != companyID {
		return forbidden(ctx, "not your team")
	}

	_, err = c.pool.Exec(ctx.Request().Context(),
		`UPDATE team_members SET is_ace = FALSE, updated_at = NOW() WHERE team_id = $1 AND is_ace = TRUE`,
		parsedTeamID)
	if err != nil {
		return internalError(ctx, err.Error())
	}

	return ctx.NoContent(http.StatusNoContent)
}

type publicTeamScoreResponse struct {
	TeamID         string             `json:"team_id"`
	TeamName       string             `json:"team_name"`
	WVScores       []publicScoreEntry `json:"wv_scores"`
	WNScores       []publicScoreEntry `json:"wn_scores"`
	CIScores       []publicScoreEntry `json:"ci_scores"`
	MemberCount    int                `json:"member_count"`
	CompletedCount int                `json:"completed_count"`
}

type publicScoreEntry struct {
	ID    string  `json:"id"`
	Score float64 `json:"score"`
}

const (
	aceWeight            = 1.8
	outlierWeight        = 0.15
	wvOutlierThreshold   = 25.0
	ciOutlierThreshold   = 1.0
	minMembersForAverage = 3
)

var (
	wvOrder = []string{"achievement", "status", "autonomy", "safety", "altruism", "comfort"}
	wnOrder = []string{
		"ability_utilization", "achievement", "activity", "advancement", "authority", "autonomy",
		"company_policies", "compensation", "co_workers", "creativity", "independence", "moral_values",
		"recognition", "responsibility", "security", "social_service", "social_status",
		"supervision_hr", "supervision_technical", "variety", "working_conditions",
	}
	ciOrder = []string{"R", "I", "A", "S", "E", "C"}
)

func (c *CompanyTeamController) GetPublicTeamScores(ctx echo.Context, companyID string) error {
	parsedCompanyID, err := uuid.Parse(companyID)
	if err != nil {
		return badRequest(ctx, "invalid company id")
	}

	reqCtx := ctx.Request().Context()

	teamRows, err := c.pool.Query(reqCtx,
		`SELECT t.id, t.name, COUNT(tm.id)
		 FROM teams t
		 LEFT JOIN team_members tm ON tm.team_id = t.id
		 WHERE t.company_id = $1 AND t.is_public = TRUE
		 GROUP BY t.id
		 ORDER BY t.created_at ASC`, parsedCompanyID)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	defer teamRows.Close()

	type teamInfo struct {
		id          uuid.UUID
		name        string
		memberCount int
	}
	var teams []teamInfo
	for teamRows.Next() {
		var t teamInfo
		if err := teamRows.Scan(&t.id, &t.name, &t.memberCount); err != nil {
			return internalError(ctx, err.Error())
		}
		teams = append(teams, t)
	}

	result := make([]publicTeamScoreResponse, 0, len(teams))
	for _, t := range teams {
		memberRows, err := c.pool.Query(reqCtx,
			`SELECT user_id, wv_status, ci_status, is_ace FROM team_members WHERE team_id = $1`,
			t.id)
		if err != nil {
			return internalError(ctx, err.Error())
		}

		type mInfo struct {
			userID   uuid.UUID
			wvStatus string
			ciStatus string
			isAce    bool
		}
		var members []mInfo
		for memberRows.Next() {
			var m mInfo
			if err := memberRows.Scan(&m.userID, &m.wvStatus, &m.ciStatus, &m.isAce); err != nil {
				memberRows.Close()
				return internalError(ctx, err.Error())
			}
			members = append(members, m)
		}
		memberRows.Close()

		var scoreData []memberScoreDataForAvg
		completedCount := 0
		for _, m := range members {
			sd := memberScoreDataForAvg{isAce: m.isAce}
			hasData := false

			if m.wvStatus == "completed" {
				wvRows, err := c.pool.Query(reqCtx,
					`SELECT ws.value_id, ws.display_score
					 FROM work_values_scores ws
					 JOIN work_values_sessions s ON s.id = ws.session_id
					 WHERE s.user_id = $1 AND s.status = 'completed'
					 ORDER BY s.completed_at DESC`, m.userID)
				if err == nil {
					sd.wvScores = map[string]float64{}
					for wvRows.Next() {
						var vid string
						var ds float64
						if err := wvRows.Scan(&vid, &ds); err == nil {
							if _, exists := sd.wvScores[vid]; !exists {
								sd.wvScores[vid] = ds
							}
						}
					}
					wvRows.Close()
					if len(sd.wvScores) > 0 {
						hasData = true
					}
				}

				wnRow := c.pool.QueryRow(reqCtx,
					`SELECT ns.mu
					 FROM work_needs_scores ns
					 JOIN work_values_sessions s ON s.id = ns.session_id
					 WHERE s.user_id = $1 AND s.status = 'completed'
					 ORDER BY s.completed_at DESC
					 LIMIT 1`, m.userID)
				var muJSON []byte
				if err := wnRow.Scan(&muJSON); err == nil {
					var mu map[string]float64
					if err := json.Unmarshal(muJSON, &mu); err == nil {
						sd.wnScores = make(map[string]float64, len(mu))
						for k, v := range mu {
							sd.wnScores[k] = 100.0 / (1.0 + math.Exp(-v))
						}
					}
				}
			}

			if m.ciStatus == "completed" {
				ciRows, err := c.pool.Query(reqCtx,
					`SELECT ts.type_id, ts.score
					 FROM career_interest_type_scores ts
					 JOIN career_interest_sessions s ON s.id = ts.session_id
					 WHERE s.user_id = $1 AND s.status = 'completed'
					 ORDER BY s.completed_at DESC`, m.userID)
				if err == nil {
					sd.ciScores = map[string]float64{}
					for ciRows.Next() {
						var tid string
						var sc float64
						if err := ciRows.Scan(&tid, &sc); err == nil {
							if _, exists := sd.ciScores[tid]; !exists {
								sd.ciScores[tid] = sc
							}
						}
					}
					ciRows.Close()
					if len(sd.ciScores) > 0 {
						hasData = true
					}
				}
			}

			if hasData {
				completedCount++
			}
			scoreData = append(scoreData, sd)
		}

		resp := publicTeamScoreResponse{
			TeamID:         t.id.String(),
			TeamName:       t.name,
			MemberCount:    t.memberCount,
			CompletedCount: completedCount,
		}

		resp.WVScores = computeWeightedAvg(scoreData, "wv", wvOrder, wvOutlierThreshold)
		resp.WNScores = computeWeightedAvg(scoreData, "wn", wnOrder, wvOutlierThreshold)
		resp.CIScores = computeWeightedAvg(scoreData, "ci", ciOrder, ciOutlierThreshold)

		result = append(result, resp)
	}

	return ctx.JSON(http.StatusOK, map[string]any{"teams": result})
}

type memberScoreDataForAvg struct {
	wvScores map[string]float64
	wnScores map[string]float64
	ciScores map[string]float64
	isAce    bool
}

func computeWeightedAvg(members []memberScoreDataForAvg, kind string, order []string, threshold float64) []publicScoreEntry {
	type entry struct {
		score float64
		isAce bool
	}

	var completed []memberScoreDataForAvg
	for _, m := range members {
		switch kind {
		case "wv":
			if len(m.wvScores) > 0 {
				completed = append(completed, m)
			}
		case "wn":
			if len(m.wnScores) > 0 {
				completed = append(completed, m)
			}
		case "ci":
			if len(m.ciScores) > 0 {
				completed = append(completed, m)
			}
		}
	}
	if len(completed) < minMembersForAverage {
		return nil
	}

	result := make([]publicScoreEntry, 0, len(order))
	for _, id := range order {
		var entries []entry
		for _, m := range completed {
			var s float64
			var ok bool
			switch kind {
			case "wv":
				s, ok = m.wvScores[id]
			case "wn":
				s, ok = m.wnScores[id]
			case "ci":
				s, ok = m.ciScores[id]
			}
			if ok {
				entries = append(entries, entry{score: s, isAce: m.isAce})
			}
		}
		if len(entries) == 0 {
			result = append(result, publicScoreEntry{ID: id, Score: 0})
			continue
		}

		sum := 0.0
		for _, e := range entries {
			sum += e.score
		}
		simpleAvg := sum / float64(len(entries))

		weightedSum := 0.0
		weightTotal := 0.0
		for _, e := range entries {
			w := 1.0
			if e.isAce {
				w = aceWeight
			} else if abs(e.score-simpleAvg) > threshold {
				w = outlierWeight
			}
			weightedSum += w * e.score
			weightTotal += w
		}
		result = append(result, publicScoreEntry{ID: id, Score: weightedSum / weightTotal})
	}
	return result
}

func abs(x float64) float64 {
	if x < 0 {
		return -x
	}
	return x
}
