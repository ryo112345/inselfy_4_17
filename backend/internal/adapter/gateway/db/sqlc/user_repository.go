package sqlc

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// UserRepository is a sqlc-backed implementation of port.UserRepository.
type UserRepository struct {
	queries *generated.Queries
}

var _ port.UserRepository = (*UserRepository)(nil)

// NewUserRepository creates a UserRepository bound to the pool.
func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{queries: generated.New(pool)}
}

// Create inserts a new user and returns the persisted entity.
func (r *UserRepository) Create(ctx context.Context, u *user.User) (*user.User, error) {
	q := queriesForContext(ctx, r.queries)

	var row *generated.User
	var err error

	if u.OAuthProvider != nil {
		row, err = q.CreateUserWithOAuth(ctx, &generated.CreateUserWithOAuthParams{
			Username:        u.Username.String(),
			Name:            u.Name,
			Email:           pgText(u.Email),
			OauthProvider:   pgText(u.OAuthProvider),
			OauthProviderID: pgText(u.OAuthProviderID),
			AvatarUrl:       pgText(u.AvatarURL),
		})
	} else {
		row, err = q.CreateUser(ctx, &generated.CreateUserParams{
			Username: u.Username.String(),
			Name:     u.Name,
		})
	}

	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, domainerr.ErrConflict
		}
		return nil, err
	}
	return toDomainUser(row)
}

// GetByUsername fetches a user by username.
func (r *UserRepository) GetByUsername(ctx context.Context, username user.Username) (*user.User, error) {
	q := queriesForContext(ctx, r.queries)
	row, err := q.GetUserByUsername(ctx, username.String())
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return toDomainUser(row)
}

// GetByID fetches a user by ID.
func (r *UserRepository) GetByID(ctx context.Context, id string) (*user.User, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrNotFound
	}
	row, err := q.GetUserByID(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return toDomainUser(row)
}

// UpdateProfile applies a partial profile update. Unset pointer fields on the
// input are skipped; explicit-clear semantics use **string where **string points
// to a nil *string.
func (r *UserRepository) UpdateProfile(ctx context.Context, id string, input user.UpdateProfileInput) (*user.User, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}

	params := &generated.UpdateUserProfileParams{
		ID:       pgID,
		Username: pgText(input.Username),
		Name:     pgText(input.Name),
		IsPublic: pgBool(input.IsPublic),
	}
	setTextField(&params.HeadlineSet, &params.Headline, input.Headline)
	setTextField(&params.LocationSet, &params.Location, input.Location)
	setTextField(&params.AboutSet, &params.About, input.About)
	setTextField(&params.IndustrySet, &params.Industry, input.Industry)
	setTextField(&params.JobTypeSet, &params.JobType, input.JobType)
	setTextField(&params.JobSeekingStatusSet, &params.JobSeekingStatus, input.JobSeekingStatus)
	setTextField(&params.ProfileColorSet, &params.ProfileColor, input.ProfileColor)

	row, err := q.UpdateUserProfile(ctx, params)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return toDomainUser(row)
}

// setTextField toggles the accompanying "set" flag when the caller provided
// a non-nil update, and copies the nullable value into the pgtype.Text param.
func setTextField(flag *bool, target *pgtype.Text, src **string) {
	if src == nil {
		return
	}
	*flag = true
	*target = pgText(*src)
}

// GetByOAuthProvider fetches a user by OAuth provider and provider ID.
func (r *UserRepository) GetByOAuthProvider(ctx context.Context, provider, providerID string) (*user.User, error) {
	q := queriesForContext(ctx, r.queries)
	row, err := q.GetUserByOAuthProvider(ctx, &generated.GetUserByOAuthProviderParams{
		OauthProvider:   pgtype.Text{String: provider, Valid: true},
		OauthProviderID: pgtype.Text{String: providerID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return toDomainUser(row)
}

func toDomainUser(u *generated.User) (*user.User, error) {
	username, err := user.ParseUsername(u.Username)
	if err != nil {
		return nil, err
	}
	return &user.User{
		ID:               uuidToString(u.ID),
		Username:         username,
		Name:             u.Name,
		Headline:         textPtr(u.Headline),
		Location:         textPtr(u.Location),
		About:            textPtr(u.About),
		Industry:         textPtr(u.Industry),
		JobType:          textPtr(u.JobType),
		JobSeekingStatus: textPtr(u.JobSeekingStatus),
		ProfileColor:     textPtr(u.ProfileColor),
		IsPublic:         u.IsPublic,
		Email:            textPtr(u.Email),
		OAuthProvider:    textPtr(u.OauthProvider),
		OAuthProviderID:  textPtr(u.OauthProviderID),
		AvatarURL:        textPtr(u.AvatarUrl),
		CreatedAt:        u.CreatedAt.Time,
		UpdatedAt:        u.UpdatedAt.Time,
	}, nil
}
