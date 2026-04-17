package usecase_test

import (
	"context"
	"errors"
	"testing"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/skill"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

func TestSkillInteractor_Attach_HappyPath(t *testing.T) {
	ctx := context.Background()
	owner := &user.User{ID: "uid-1", Username: mustParseUsername(t, "alice")}

	listCall := 0
	repo := &skillRepoStub{
		upsertFn: func(_ context.Context, name string) (*skill.Skill, error) {
			return &skill.Skill{ID: "sk-1", Name: name}, nil
		},
		attachFn: func(_ context.Context, _ string, _ string) error { return nil },
		listByUserIDFn: func(_ context.Context, _ string) ([]*skill.UserSkill, error) {
			listCall++
			return []*skill.UserSkill{{Skill: skill.Skill{ID: "sk-1", Name: "Go"}}}, nil
		},
	}
	userRepo := &userRepoStub{
		getByUsername: func(_ context.Context, _ user.Username) (*user.User, error) { return owner, nil },
	}
	out := &skillOutputStub{}
	it := usecase.NewSkillInteractor(repo, userRepo, inlineTxManager{}, out)

	if err := it.Attach(ctx, "alice", "Go"); err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if out.presentedSingle == nil || out.presentedSingle.Name != "Go" {
		t.Fatalf("presenter not invoked with skill")
	}
	if listCall == 0 {
		t.Fatalf("list should be used to retrieve attachment timestamp")
	}
}

func TestSkillInteractor_Attach_AlreadyAttached(t *testing.T) {
	ctx := context.Background()
	owner := &user.User{ID: "uid-1", Username: mustParseUsername(t, "alice")}
	repo := &skillRepoStub{
		userHasSkillNameFn: func(_ context.Context, _ string, _ string) (bool, error) { return true, nil },
	}
	userRepo := &userRepoStub{
		getByUsername: func(_ context.Context, _ user.Username) (*user.User, error) { return owner, nil },
	}
	it := usecase.NewSkillInteractor(repo, userRepo, inlineTxManager{}, &skillOutputStub{})

	err := it.Attach(ctx, "alice", "Go")
	if !errors.Is(err, domainerr.ErrConflict) {
		t.Fatalf("expected ErrConflict, got %v", err)
	}
}

func TestSkillInteractor_Attach_RejectsOverLimit(t *testing.T) {
	ctx := context.Background()
	owner := &user.User{ID: "uid-1", Username: mustParseUsername(t, "alice")}
	repo := &skillRepoStub{
		userHasSkillNameFn: func(_ context.Context, _, _ string) (bool, error) { return false, nil },
		countByUserIDFn: func(_ context.Context, _ string) (int64, error) {
			return int64(skill.MaxPerUser), nil
		},
	}
	userRepo := &userRepoStub{
		getByUsername: func(_ context.Context, _ user.Username) (*user.User, error) { return owner, nil },
	}
	it := usecase.NewSkillInteractor(repo, userRepo, inlineTxManager{}, &skillOutputStub{})

	err := it.Attach(ctx, "alice", "Go")
	if !errors.Is(err, skill.ErrTooManyEntries) {
		t.Fatalf("expected ErrTooManyEntries, got %v", err)
	}
}
