package controller_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// stubInput records the UpdateProfile invocation for assertions.
type stubInput struct {
	createFn  func(ctx context.Context, in user.CreateUserInput) error
	getFn     func(ctx context.Context, username string) error
	updateFn  func(ctx context.Context, username string, in user.UpdateProfileInput) error
	presenter *presenter.UserPresenter
}

func (s *stubInput) Create(ctx context.Context, in user.CreateUserInput) error {
	return s.createFn(ctx, in)
}
func (s *stubInput) GetByUsername(ctx context.Context, u string) error { return s.getFn(ctx, u) }
func (s *stubInput) GetByID(_ context.Context, _ string) error        { return nil }
func (s *stubInput) UpdateProfile(ctx context.Context, u string, in user.UpdateProfileInput) error {
	return s.updateFn(ctx, u, in)
}

type stubRepo struct{}

func (stubRepo) Create(context.Context, *user.User) (*user.User, error)                { return nil, nil }
func (stubRepo) GetByUsername(context.Context, user.Username) (*user.User, error)      { return nil, nil }
func (stubRepo) GetByID(context.Context, string) (*user.User, error)                  { return nil, nil }
func (stubRepo) UpdateProfile(context.Context, string, user.UpdateProfileInput) (*user.User, error) {
	return nil, nil
}

// controllerWith builds a UserController bound to the provided stub input.
func controllerWith(stub *stubInput) *controller.UserController {
	return controller.NewUserController(
		func(port.UserRepository, port.UserOutputPort) port.UserInputPort { return stub },
		func() *presenter.UserPresenter { return stub.presenter },
		func() port.UserRepository { return stubRepo{} },
	)
}

func TestUpdateProfile_DistinguishesAbsentFromNull(t *testing.T) {
	received := make(chan user.UpdateProfileInput, 1)
	stub := &stubInput{
		updateFn: func(_ context.Context, _ string, in user.UpdateProfileInput) error {
			received <- in
			return nil
		},
		presenter: presenter.NewUserPresenter(),
	}
	// Seed a response so JSON serialization has data
	_ = stub.presenter.PresentUser(context.Background(), &user.User{
		ID: "uid-1", Username: mustParseUsername(t, "alice"), Name: "Alice", CreatedAt: time.Now(), UpdatedAt: time.Now(),
	})

	c := controllerWith(stub)
	e := echo.New()

	// Body: headline present with value, about explicitly null, location absent.
	body := `{"headline":"Backend","about":null}`
	req := httptest.NewRequest(http.MethodPatch, "/api/users/alice", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	ectx := e.NewContext(req, rec)

	if err := c.UpdateProfile(ectx, "alice"); err != nil {
		t.Fatalf("handler err: %v", err)
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("status: got %d, body=%s", rec.Code, rec.Body.String())
	}
	in := <-received
	if in.Headline == nil || *in.Headline == nil || **in.Headline != "Backend" {
		t.Fatalf("expected Headline set to 'Backend', got %+v", in.Headline)
	}
	if in.About == nil {
		t.Fatalf("expected About to be set (explicit null)")
	}
	if *in.About != nil {
		t.Fatalf("expected About to clear (**string → nil *string), got %+v", *in.About)
	}
	if in.Location != nil {
		t.Fatalf("expected Location to be untouched (absent from body)")
	}
}

func TestUpdateProfile_RejectsNullName(t *testing.T) {
	stub := &stubInput{
		updateFn: func(_ context.Context, _ string, _ user.UpdateProfileInput) error {
			t.Fatal("usecase should not be called when name is null")
			return nil
		},
		presenter: presenter.NewUserPresenter(),
	}
	c := controllerWith(stub)
	e := echo.New()

	body := `{"name": null}`
	req := httptest.NewRequest(http.MethodPatch, "/api/users/alice", strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	ectx := e.NewContext(req, rec)

	if err := c.UpdateProfile(ectx, "alice"); err != nil {
		t.Fatalf("handler err: %v", err)
	}
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status: got %d, body=%s", rec.Code, rec.Body.String())
	}
	var resp map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode resp: %v", err)
	}
	if resp["code"] != "BAD_REQUEST" {
		t.Fatalf("expected BAD_REQUEST code, got %v", resp["code"])
	}
}

func mustParseUsername(t *testing.T, raw string) user.Username {
	t.Helper()
	u, err := user.ParseUsername(raw)
	if err != nil {
		t.Fatalf("ParseUsername(%q): %v", raw, err)
	}
	return u
}
