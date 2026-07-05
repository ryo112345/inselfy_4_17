package usecase_test

import (
	"context"
	"errors"
	"testing"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

func TestUserInteractor_Create(t *testing.T) {
	ctx := context.Background()

	t.Run("happy path", func(t *testing.T) {
		repo := &userRepoStub{
			createFn: func(_ context.Context, u *user.User) (*user.User, error) {
				u.ID = "00000000-0000-0000-0000-000000000001"
				return u, nil
			},
		}
		it := usecase.NewUserInteractor(repo)

		created, err := it.Create(ctx, user.CreateUserInput{Name: "Alice", Username: "alice"})
		if err != nil {
			t.Fatalf("unexpected err: %v", err)
		}
		if created == nil || created.ID != "00000000-0000-0000-0000-000000000001" {
			t.Fatalf("expected the created user to be returned")
		}
	})

	t.Run("invalid username", func(t *testing.T) {
		it := usecase.NewUserInteractor(&userRepoStub{})
		_, err := it.Create(ctx, user.CreateUserInput{Name: "Alice", Username: "x"})
		if !errors.Is(err, user.ErrInvalidUsername) {
			t.Fatalf("expected ErrInvalidUsername, got %v", err)
		}
	})

	t.Run("empty name", func(t *testing.T) {
		it := usecase.NewUserInteractor(&userRepoStub{})
		_, err := it.Create(ctx, user.CreateUserInput{Name: " ", Username: "alice"})
		if !errors.Is(err, user.ErrNameRequired) {
			t.Fatalf("expected ErrNameRequired, got %v", err)
		}
	})
}

func TestUserInteractor_UpdateProfile(t *testing.T) {
	ctx := context.Background()
	existing := &user.User{ID: "uid-1", Username: mustParseUsername(t, "alice"), Name: "Alice"}

	t.Run("patch headline only", func(t *testing.T) {
		var received user.UpdateProfileInput
		repo := &userRepoStub{
			getByUsername: func(_ context.Context, _ user.Username) (*user.User, error) { return existing, nil },
			updateProfile: func(_ context.Context, id string, in user.UpdateProfileInput) (*user.User, error) {
				if id != "uid-1" {
					t.Fatalf("got id %q", id)
				}
				received = in
				returned := *existing
				returned.Headline = derefOrNil(in.Headline)
				return &returned, nil
			},
		}
		it := usecase.NewUserInteractor(repo)

		hl := "Backend Engineer"
		input := user.UpdateProfileInput{Headline: ptrPtrString(&hl)}
		if _, err := it.UpdateProfile(ctx, "alice", input); err != nil {
			t.Fatalf("unexpected err: %v", err)
		}
		if received.Name != nil {
			t.Fatalf("Name should not be touched")
		}
		if received.Headline == nil || *received.Headline == nil || **received.Headline != "Backend Engineer" {
			t.Fatalf("Headline not forwarded correctly: %+v", received.Headline)
		}
	})

	t.Run("user not found", func(t *testing.T) {
		repo := &userRepoStub{
			getByUsername: func(_ context.Context, _ user.Username) (*user.User, error) { return nil, domainerr.ErrNotFound },
		}
		it := usecase.NewUserInteractor(repo)
		_, err := it.UpdateProfile(ctx, "ghost", user.UpdateProfileInput{})
		if !errors.Is(err, domainerr.ErrNotFound) {
			t.Fatalf("expected ErrNotFound, got %v", err)
		}
	})

	t.Run("invalid profile color rejected before repo call", func(t *testing.T) {
		called := false
		repo := &userRepoStub{
			getByUsername: func(_ context.Context, _ user.Username) (*user.User, error) {
				called = true
				return existing, nil
			},
		}
		it := usecase.NewUserInteractor(repo)
		bad := "not-a-color"
		_, err := it.UpdateProfile(ctx, "alice", user.UpdateProfileInput{ProfileColor: ptrPtrString(&bad)})
		if !errors.Is(err, user.ErrInvalidProfileColor) {
			t.Fatalf("expected ErrInvalidProfileColor, got %v", err)
		}
		if called {
			t.Fatalf("repo should not be called when validation fails")
		}
	})
}

func ptrPtrString(s *string) **string { return &s }

func derefOrNil(pp **string) *string {
	if pp == nil {
		return nil
	}
	return *pp
}

func mustParseUsername(t *testing.T, raw string) user.Username {
	t.Helper()
	u, err := user.ParseUsername(raw)
	if err != nil {
		t.Fatalf("ParseUsername(%q): %v", raw, err)
	}
	return u
}
