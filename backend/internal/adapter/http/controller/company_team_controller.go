package controller

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
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
	CreatedAt   string  `json:"created_at"`
}

type teamDetailResponse struct {
	ID          string           `json:"id"`
	CompanyID   string           `json:"company_id"`
	Name        string           `json:"name"`
	Description *string          `json:"description"`
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
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid company id"})
	}

	rows, err := c.pool.Query(ctx.Request().Context(),
		`SELECT t.id, t.company_id, t.name, t.description, t.created_at,
			COUNT(tm.id) AS member_count,
			COUNT(CASE WHEN tm.wv_status = 'completed' THEN 1 END) AS wv_completed,
			COUNT(CASE WHEN tm.ci_status = 'completed' THEN 1 END) AS ci_completed
		 FROM teams t
		 LEFT JOIN team_members tm ON tm.team_id = t.id
		 WHERE t.company_id = $1
		 GROUP BY t.id
		 ORDER BY t.created_at DESC`, parsed)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	defer rows.Close()

	teams := []teamResponse{}
	for rows.Next() {
		var t teamResponse
		var id, cid uuid.UUID
		var desc *string
		var createdAt time.Time
		if err := rows.Scan(&id, &cid, &t.Name, &desc, &createdAt, &t.MemberCount, &t.WVCompleted, &t.CICompleted); err != nil {
			return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
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
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid company id"})
	}

	var body struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
	}
	if err := ctx.Bind(&body); err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid request"})
	}
	if body.Name == "" || len(body.Name) > 100 {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "name is required (max 100 chars)"})
	}

	var id uuid.UUID
	var createdAt time.Time
	err = c.pool.QueryRow(ctx.Request().Context(),
		`INSERT INTO teams (company_id, name, description) VALUES ($1, $2, $3) RETURNING id, created_at`,
		parsedCompanyID, body.Name, body.Description,
	).Scan(&id, &createdAt)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
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
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid team id"})
	}

	var team teamDetailResponse
	var tid, cid uuid.UUID
	var createdAt time.Time
	err = c.pool.QueryRow(ctx.Request().Context(),
		`SELECT id, company_id, name, description, created_at FROM teams WHERE id = $1 AND company_id = $2`,
		parsedTeamID, companyID,
	).Scan(&tid, &cid, &team.Name, &team.Description, &createdAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ctx.JSON(http.StatusNotFound, map[string]string{"message": "team not found"})
		}
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	team.ID = tid.String()
	team.CompanyID = cid.String()
	team.CreatedAt = createdAt.Format(time.RFC3339)

	memberRows, err := c.pool.Query(ctx.Request().Context(),
		`SELECT id, name, email, invite_token, wv_status, ci_status, created_at
		 FROM team_members WHERE team_id = $1 ORDER BY created_at ASC`, parsedTeamID)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	defer memberRows.Close()

	members := []memberResponse{}
	for memberRows.Next() {
		var m memberResponse
		var mid uuid.UUID
		var email *string
		var mCreatedAt time.Time
		if err := memberRows.Scan(&mid, &m.Name, &email, &m.InviteToken, &m.WVStatus, &m.CIStatus, &mCreatedAt); err != nil {
			return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
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
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid team id"})
	}

	var body struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
	}
	if err := ctx.Bind(&body); err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid request"})
	}
	if body.Name == "" || len(body.Name) > 100 {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "name is required (max 100 chars)"})
	}

	tag, err := c.pool.Exec(ctx.Request().Context(),
		`UPDATE teams SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 AND company_id = $4`,
		body.Name, body.Description, parsedTeamID, companyID,
	)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	if tag.RowsAffected() == 0 {
		return ctx.JSON(http.StatusNotFound, map[string]string{"message": "team not found"})
	}

	return ctx.NoContent(http.StatusNoContent)
}

func (c *CompanyTeamController) DeleteTeam(ctx echo.Context, teamID string) error {
	companyID := c.companyID(ctx)
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid team id"})
	}

	tag, err := c.pool.Exec(ctx.Request().Context(),
		`DELETE FROM teams WHERE id = $1 AND company_id = $2`,
		parsedTeamID, companyID,
	)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	if tag.RowsAffected() == 0 {
		return ctx.JSON(http.StatusNotFound, map[string]string{"message": "team not found"})
	}

	return ctx.NoContent(http.StatusNoContent)
}

func (c *CompanyTeamController) AddMember(ctx echo.Context, teamID string) error {
	companyID := c.companyID(ctx)
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid team id"})
	}

	// Verify team belongs to this company
	var ownerID string
	err = c.pool.QueryRow(ctx.Request().Context(),
		`SELECT company_id FROM teams WHERE id = $1`, parsedTeamID,
	).Scan(&ownerID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ctx.JSON(http.StatusNotFound, map[string]string{"message": "team not found"})
		}
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	if ownerID != companyID {
		return ctx.JSON(http.StatusForbidden, map[string]string{"message": "not your team"})
	}

	// Check member count limit (30)
	var memberCount int
	err = c.pool.QueryRow(ctx.Request().Context(),
		`SELECT COUNT(*) FROM team_members WHERE team_id = $1`, parsedTeamID,
	).Scan(&memberCount)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	if memberCount >= 30 {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "チームメンバーは最大30人までです"})
	}

	var body struct {
		Name  string  `json:"name"`
		Email *string `json:"email"`
	}
	if err := ctx.Bind(&body); err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid request"})
	}
	if body.Name == "" || len(body.Name) > 100 {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "name is required (max 100 chars)"})
	}

	reqCtx := ctx.Request().Context()

	// Create a users record for this team member
	userID, err := c.createTeamMemberUser(reqCtx, body.Name)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	token, err := generateInviteToken()
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	var memberID uuid.UUID
	var createdAt time.Time
	err = c.pool.QueryRow(reqCtx,
		`INSERT INTO team_members (team_id, user_id, name, email, invite_token)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
		parsedTeamID, userID, body.Name, body.Email, token,
	).Scan(&memberID, &createdAt)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
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
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid team id"})
	}
	parsedMemberID, err := uuid.Parse(memberID)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid member id"})
	}

	// Verify team belongs to this company
	var ownerID string
	err = c.pool.QueryRow(ctx.Request().Context(),
		`SELECT company_id FROM teams WHERE id = $1`, parsedTeamID,
	).Scan(&ownerID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ctx.JSON(http.StatusNotFound, map[string]string{"message": "team not found"})
		}
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	if ownerID != companyID {
		return ctx.JSON(http.StatusForbidden, map[string]string{"message": "not your team"})
	}

	// Get user_id before deleting member (to clean up the user record)
	var userID uuid.UUID
	err = c.pool.QueryRow(ctx.Request().Context(),
		`SELECT user_id FROM team_members WHERE id = $1 AND team_id = $2`, parsedMemberID, parsedTeamID,
	).Scan(&userID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ctx.JSON(http.StatusNotFound, map[string]string{"message": "member not found"})
		}
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	// Delete member (cascades from team_members)
	_, err = c.pool.Exec(ctx.Request().Context(),
		`DELETE FROM team_members WHERE id = $1 AND team_id = $2`, parsedMemberID, parsedTeamID,
	)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
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
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid team id"})
	}

	var ownerID string
	err = c.pool.QueryRow(ctx.Request().Context(),
		`SELECT company_id FROM teams WHERE id = $1`, parsedTeamID,
	).Scan(&ownerID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ctx.JSON(http.StatusNotFound, map[string]string{"message": "team not found"})
		}
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	if ownerID != companyID {
		return ctx.JSON(http.StatusForbidden, map[string]string{"message": "not your team"})
	}

	reqCtx := ctx.Request().Context()

	memberRows, err := c.pool.Query(reqCtx,
		`SELECT id, user_id, name, wv_status, ci_status FROM team_members WHERE team_id = $1 ORDER BY created_at ASC`,
		parsedTeamID)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	defer memberRows.Close()

	type memberInfo struct {
		id       uuid.UUID
		userID   uuid.UUID
		name     string
		wvStatus string
		ciStatus string
	}
	var members []memberInfo
	for memberRows.Next() {
		var m memberInfo
		if err := memberRows.Scan(&m.id, &m.userID, &m.name, &m.wvStatus, &m.ciStatus); err != nil {
			return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
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
