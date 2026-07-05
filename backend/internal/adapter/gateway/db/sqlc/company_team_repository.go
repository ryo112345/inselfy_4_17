package sqlc

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	"github.com/akiyama/inselfy/backend/internal/domain/company"
	driverdb "github.com/akiyama/inselfy/backend/internal/driver/db"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CompanyTeamRepository struct {
	pool *pgxpool.Pool
}

var _ port.CompanyTeamRepository = (*CompanyTeamRepository)(nil)

func NewCompanyTeamRepository(pool *pgxpool.Pool) *CompanyTeamRepository {
	return &CompanyTeamRepository{pool: pool}
}

// db returns the ambient transaction handle if the context carries one,
// otherwise the pool, so writes compose under port.TxManager.
func (r *CompanyTeamRepository) db(ctx context.Context) generated.DBTX {
	if tx := driverdb.TxFromContext(ctx); tx != nil {
		return tx
	}
	return r.pool
}

func (r *CompanyTeamRepository) CreateTeam(ctx context.Context, companyID, name string, description *string) (*company.Team, error) {
	parsedCompanyID, err := uuid.Parse(companyID)
	if err != nil {
		return nil, err
	}

	var id uuid.UUID
	var createdAt time.Time
	err = r.db(ctx).QueryRow(ctx,
		`INSERT INTO teams (company_id, name, description) VALUES ($1, $2, $3) RETURNING id, created_at`,
		parsedCompanyID, name, description,
	).Scan(&id, &createdAt)
	if err != nil {
		return nil, err
	}

	return &company.Team{
		ID:          id.String(),
		CompanyID:   companyID,
		Name:        name,
		Description: description,
		CreatedAt:   createdAt,
	}, nil
}

func (r *CompanyTeamRepository) GetTeam(ctx context.Context, teamID, companyID string) (*company.Team, error) {
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return nil, err
	}

	var t company.Team
	var tid, cid uuid.UUID
	err = r.db(ctx).QueryRow(ctx,
		`SELECT id, company_id, name, description, is_public, created_at FROM teams WHERE id = $1 AND company_id = $2`,
		parsedTeamID, companyID,
	).Scan(&tid, &cid, &t.Name, &t.Description, &t.IsPublic, &t.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, company.ErrTeamNotFound
		}
		return nil, err
	}
	t.ID = tid.String()
	t.CompanyID = cid.String()
	return &t, nil
}

func (r *CompanyTeamRepository) UpdateTeam(ctx context.Context, teamID, companyID, name string, description *string, isPublic *bool) error {
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return err
	}

	var tag pgconn.CommandTag
	if isPublic != nil {
		tag, err = r.db(ctx).Exec(ctx,
			`UPDATE teams SET name = $1, description = $2, is_public = $3, updated_at = NOW() WHERE id = $4 AND company_id = $5`,
			name, description, *isPublic, parsedTeamID, companyID,
		)
	} else {
		tag, err = r.db(ctx).Exec(ctx,
			`UPDATE teams SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 AND company_id = $4`,
			name, description, parsedTeamID, companyID,
		)
	}
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return company.ErrTeamNotFound
	}
	return nil
}

func (r *CompanyTeamRepository) DeleteTeam(ctx context.Context, teamID, companyID string) error {
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return err
	}

	tag, err := r.db(ctx).Exec(ctx,
		`DELETE FROM teams WHERE id = $1 AND company_id = $2`,
		parsedTeamID, companyID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return company.ErrTeamNotFound
	}
	return nil
}

func (r *CompanyTeamRepository) GetTeamOwner(ctx context.Context, teamID string) (string, error) {
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return "", err
	}

	var ownerID string
	err = r.db(ctx).QueryRow(ctx,
		`SELECT company_id FROM teams WHERE id = $1`, parsedTeamID,
	).Scan(&ownerID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", company.ErrTeamNotFound
		}
		return "", err
	}
	return ownerID, nil
}

func (r *CompanyTeamRepository) ListMembers(ctx context.Context, teamID string) ([]company.TeamMember, error) {
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return nil, err
	}

	rows, err := r.db(ctx).Query(ctx,
		`SELECT id, name, email, invite_token, wv_status, ci_status, is_ace, created_at
		 FROM team_members WHERE team_id = $1 ORDER BY created_at ASC`, parsedTeamID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	members := []company.TeamMember{}
	for rows.Next() {
		var m company.TeamMember
		var mid uuid.UUID
		if err := rows.Scan(&mid, &m.Name, &m.Email, &m.InviteToken, &m.WVStatus, &m.CIStatus, &m.IsAce, &m.CreatedAt); err != nil {
			return nil, err
		}
		m.ID = mid.String()
		members = append(members, m)
	}
	return members, rows.Err()
}

func (r *CompanyTeamRepository) CountMembers(ctx context.Context, teamID string) (int, error) {
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return 0, err
	}

	var count int
	err = r.db(ctx).QueryRow(ctx,
		`SELECT COUNT(*) FROM team_members WHERE team_id = $1`, parsedTeamID,
	).Scan(&count)
	if err != nil {
		return 0, err
	}
	return count, nil
}

func (r *CompanyTeamRepository) CreateMemberUser(ctx context.Context, username, name string) (string, error) {
	var userID uuid.UUID
	err := r.db(ctx).QueryRow(ctx,
		`INSERT INTO users (username, name) VALUES ($1, $2) RETURNING id`,
		username, name,
	).Scan(&userID)
	if err != nil {
		return "", err
	}
	return userID.String(), nil
}

func (r *CompanyTeamRepository) AddMember(ctx context.Context, teamID, userID, name string, email *string, inviteToken string) (*company.TeamMember, error) {
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return nil, err
	}
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}

	var memberID uuid.UUID
	var createdAt time.Time
	err = r.db(ctx).QueryRow(ctx,
		`INSERT INTO team_members (team_id, user_id, name, email, invite_token)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
		parsedTeamID, parsedUserID, name, email, inviteToken,
	).Scan(&memberID, &createdAt)
	if err != nil {
		return nil, err
	}

	return &company.TeamMember{
		ID:          memberID.String(),
		Name:        name,
		Email:       email,
		InviteToken: inviteToken,
		WVStatus:    "pending",
		CIStatus:    "pending",
		CreatedAt:   createdAt,
	}, nil
}

func (r *CompanyTeamRepository) GetMemberUserID(ctx context.Context, teamID, memberID string) (string, error) {
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return "", err
	}
	parsedMemberID, err := uuid.Parse(memberID)
	if err != nil {
		return "", err
	}

	var userID uuid.UUID
	err = r.db(ctx).QueryRow(ctx,
		`SELECT user_id FROM team_members WHERE id = $1 AND team_id = $2`, parsedMemberID, parsedTeamID,
	).Scan(&userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", company.ErrTeamMemberNotFound
		}
		return "", err
	}
	return userID.String(), nil
}

func (r *CompanyTeamRepository) DeleteMember(ctx context.Context, teamID, memberID string) error {
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return err
	}
	parsedMemberID, err := uuid.Parse(memberID)
	if err != nil {
		return err
	}

	_, err = r.db(ctx).Exec(ctx,
		`DELETE FROM team_members WHERE id = $1 AND team_id = $2`, parsedMemberID, parsedTeamID,
	)
	return err
}

func (r *CompanyTeamRepository) DeleteMemberUser(ctx context.Context, userID string) error {
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return err
	}

	_, err = r.db(ctx).Exec(ctx,
		`DELETE FROM users WHERE id = $1 AND username LIKE 'tm_%'`, parsedUserID,
	)
	return err
}

func (r *CompanyTeamRepository) UnsetAce(ctx context.Context, teamID string) error {
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return err
	}

	_, err = r.db(ctx).Exec(ctx,
		`UPDATE team_members SET is_ace = FALSE, updated_at = NOW() WHERE team_id = $1 AND is_ace = TRUE`,
		parsedTeamID)
	return err
}

func (r *CompanyTeamRepository) SetAce(ctx context.Context, teamID, memberID string) error {
	parsedTeamID, err := uuid.Parse(teamID)
	if err != nil {
		return err
	}
	parsedMemberID, err := uuid.Parse(memberID)
	if err != nil {
		return err
	}

	tag, err := r.db(ctx).Exec(ctx,
		`UPDATE team_members SET is_ace = TRUE, updated_at = NOW() WHERE id = $1 AND team_id = $2`,
		parsedMemberID, parsedTeamID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return company.ErrTeamMemberNotFound
	}
	return nil
}
