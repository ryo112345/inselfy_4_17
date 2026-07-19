package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/akiyama/inselfy/backend/internal/domain/experience"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

func TestExperienceInteractor_Update_OwnershipCheck(t *testing.T) {
	ctx := context.Background()
	owner := &user.User{ID: "uid-1", Username: mustParseUsername(t, "alice"), Name: "Alice"}
	foreign := &experience.Experience{ID: "exp-1", UserID: "uid-2"}

	repo := &experienceRepoStub{
		getByIDFn: func(_ context.Context, id string) (*experience.Experience, error) {
			return foreign, nil
		},
		updateFn: func(_ context.Context, _ *experience.Experience) (*experience.Experience, error) {
			t.Fatal("update should not be called when ownership fails")
			return nil, nil
		},
	}
	userRepo := &userRepoStub{
		getByUsername: func(_ context.Context, _ user.Username) (*user.User, error) { return owner, nil },
	}
	it := usecase.NewExperienceInteractor(repo, userRepo)

	_, err := it.Update(ctx, "uid-1", "alice", "exp-1", experience.UpdateInput{
		CompanyName: "Acme", Title: "Engineer",
		StartYear: 2020, StartMonth: 4, IsCurrent: true,
	})
	if !errors.Is(err, port.ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}

// TestExperienceInteractor_Update_RejectsForeignCaller guards against the IDOR
// where a logged-in user edits another user's experiences by putting that
// user's name in the path. The caller (attacker-uid) is not alice, so the
// request must be rejected before any lookup of the target resource.
func TestExperienceInteractor_Update_RejectsForeignCaller(t *testing.T) {
	ctx := context.Background()
	owner := &user.User{ID: "uid-1", Username: mustParseUsername(t, "alice"), Name: "Alice"}

	repo := &experienceRepoStub{
		getByIDFn: func(_ context.Context, _ string) (*experience.Experience, error) {
			t.Fatal("resource must not be fetched for a non-owner caller")
			return nil, nil
		},
		updateFn: func(_ context.Context, _ *experience.Experience) (*experience.Experience, error) {
			t.Fatal("update must not run for a non-owner caller")
			return nil, nil
		},
	}
	userRepo := &userRepoStub{
		getByUsername: func(_ context.Context, _ user.Username) (*user.User, error) { return owner, nil },
	}
	it := usecase.NewExperienceInteractor(repo, userRepo)

	_, err := it.Update(ctx, "attacker-uid", "alice", "exp-1", experience.UpdateInput{
		CompanyName: "Acme", Title: "Engineer",
		StartYear: 2020, StartMonth: 4, IsCurrent: true,
	})
	if !errors.Is(err, port.ErrForbidden) {
		t.Fatalf("expected ErrForbidden, got %v", err)
	}
}

func TestExperienceInteractor_Create_RejectsOverLimit(t *testing.T) {
	ctx := context.Background()
	owner := &user.User{ID: "uid-1", Username: mustParseUsername(t, "alice")}
	repo := &experienceRepoStub{
		countByUserIDFn: func(_ context.Context, _ string) (int64, error) {
			return int64(experience.MaxPerUser), nil
		},
	}
	userRepo := &userRepoStub{
		getByUsername: func(_ context.Context, _ user.Username) (*user.User, error) { return owner, nil },
	}
	it := usecase.NewExperienceInteractor(repo, userRepo)

	_, err := it.Create(ctx, "uid-1", "alice", experience.CreateInput{
		CompanyName: "Acme", Title: "Engineer",
		StartYear: 2020, StartMonth: 1, IsCurrent: true,
	})
	if !errors.Is(err, experience.ErrTooManyEntries) {
		t.Fatalf("expected ErrTooManyEntries, got %v", err)
	}
}
