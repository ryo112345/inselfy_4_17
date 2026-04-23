package controller

import (
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
)

type TeamDiagnoseController struct {
	pool *pgxpool.Pool
}

func NewTeamDiagnoseController(pool *pgxpool.Pool) *TeamDiagnoseController {
	return &TeamDiagnoseController{pool: pool}
}

type diagnoseInfoResponse struct {
	MemberID    string  `json:"member_id"`
	MemberName  string  `json:"member_name"`
	TeamName    string  `json:"team_name"`
	CompanyName string  `json:"company_name"`
	UserID      string  `json:"user_id"`
	WVStatus    string  `json:"wv_status"`
	CIStatus    string  `json:"ci_status"`
	Email       *string `json:"email"`
}

func (c *TeamDiagnoseController) GetByToken(ctx echo.Context, token string) error {
	var resp diagnoseInfoResponse
	var memberID, userID uuid.UUID
	var email *string

	err := c.pool.QueryRow(ctx.Request().Context(),
		`SELECT tm.id, tm.user_id, tm.name, tm.email, tm.wv_status, tm.ci_status,
			t.name AS team_name, ca.company_name
		 FROM team_members tm
		 JOIN teams t ON t.id = tm.team_id
		 JOIN company_accounts ca ON ca.id = t.company_id
		 WHERE tm.invite_token = $1`, token,
	).Scan(&memberID, &userID, &resp.MemberName, &email, &resp.WVStatus, &resp.CIStatus, &resp.TeamName, &resp.CompanyName)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ctx.JSON(http.StatusNotFound, map[string]string{"message": "無効なリンクです"})
		}
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	resp.MemberID = memberID.String()
	resp.UserID = userID.String()
	resp.Email = email

	return ctx.JSON(http.StatusOK, resp)
}

func (c *TeamDiagnoseController) UpdateStatus(ctx echo.Context, token string) error {
	var body struct {
		WVStatus *string `json:"wv_status"`
		CIStatus *string `json:"ci_status"`
	}
	if err := ctx.Bind(&body); err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid request"})
	}

	if body.WVStatus != nil {
		if *body.WVStatus != "completed" {
			return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "wv_status must be 'completed'"})
		}
		tag, err := c.pool.Exec(ctx.Request().Context(),
			`UPDATE team_members SET wv_status = $1, updated_at = $2 WHERE invite_token = $3`,
			*body.WVStatus, time.Now(), token,
		)
		if err != nil {
			return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
		}
		if tag.RowsAffected() == 0 {
			return ctx.JSON(http.StatusNotFound, map[string]string{"message": "member not found"})
		}
	}

	if body.CIStatus != nil {
		if *body.CIStatus != "completed" {
			return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "ci_status must be 'completed'"})
		}
		tag, err := c.pool.Exec(ctx.Request().Context(),
			`UPDATE team_members SET ci_status = $1, updated_at = $2 WHERE invite_token = $3`,
			*body.CIStatus, time.Now(), token,
		)
		if err != nil {
			return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
		}
		if tag.RowsAffected() == 0 {
			return ctx.JSON(http.StatusNotFound, map[string]string{"message": "member not found"})
		}
	}

	return ctx.NoContent(http.StatusNoContent)
}
