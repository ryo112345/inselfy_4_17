// Package controller contains HTTP controllers.
package controller

import (
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// UserController handles user HTTP endpoints.
type UserController struct {
	inputFactory  func(repo port.UserRepository, output port.UserOutputPort) port.UserInputPort
	outputFactory func() *presenter.UserPresenter
	repoFactory   func() port.UserRepository
	storage       port.FileStorage
}

// NewUserController creates a UserController.
func NewUserController(
	inputFactory func(repo port.UserRepository, output port.UserOutputPort) port.UserInputPort,
	outputFactory func() *presenter.UserPresenter,
	repoFactory func() port.UserRepository,
	storage port.FileStorage,
) *UserController {
	return &UserController{
		inputFactory:  inputFactory,
		outputFactory: outputFactory,
		repoFactory:   repoFactory,
		storage:       storage,
	}
}

// Create handles POST /api/users.
func (c *UserController) Create(ctx echo.Context) error {
	var body openapi.ModelsCreateUserRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	input, p := c.newIO()
	if err := input.Create(ctx.Request().Context(), user.CreateUserInput{
		Name:     body.Name,
		Username: body.Username,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.Response())
}

// GetByUsername handles GET /api/users/:username.
func (c *UserController) GetByUsername(ctx echo.Context, username string) error {
	input, p := c.newIO()
	if err := input.GetByUsername(ctx.Request().Context(), username); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.Response())
}

// GetByID handles GET /api/users/id/:id.
func (c *UserController) GetByID(ctx echo.Context, id string) error {
	input, p := c.newIO()
	if err := input.GetByID(ctx.Request().Context(), id); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.Response())
}

// UpdateProfile handles PATCH /api/users/:username.
//
// We read the request body into map[string]json.RawMessage so we can
// distinguish "field absent" from "field explicitly null". Absent keys become
// nil pointers (do not touch), while explicit null becomes **string with *
// nil (clear to null).
func (c *UserController) UpdateProfile(ctx echo.Context, username string) error {
	raw := map[string]json.RawMessage{}
	if err := json.NewDecoder(ctx.Request().Body).Decode(&raw); err != nil {
		return badRequest(ctx, "invalid body")
	}
	input, err := decodeUpdateProfile(raw)
	if err != nil {
		return badRequest(ctx, err.Error())
	}
	in, p := c.newIO()
	if err := in.UpdateProfile(ctx.Request().Context(), username, input); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.Response())
}

func decodeUpdateProfile(raw map[string]json.RawMessage) (user.UpdateProfileInput, error) {
	var input user.UpdateProfileInput

	if v, ok := raw["username"]; ok {
		var s *string
		if err := json.Unmarshal(v, &s); err != nil {
			return input, invalidField("username")
		}
		if s == nil {
			return input, invalidField("username")
		}
		input.Username = s
	}
	if v, ok := raw["name"]; ok {
		var s *string
		if err := json.Unmarshal(v, &s); err != nil {
			return input, invalidField("name")
		}
		if s == nil {
			return input, invalidField("name")
		}
		input.Name = s
	}
	if err := decodeNullableString(raw, "headline", &input.Headline); err != nil {
		return input, err
	}
	if err := decodeNullableString(raw, "location", &input.Location); err != nil {
		return input, err
	}
	if err := decodeNullableString(raw, "about", &input.About); err != nil {
		return input, err
	}
	if err := decodeNullableString(raw, "industry", &input.Industry); err != nil {
		return input, err
	}
	if err := decodeNullableString(raw, "jobType", &input.JobType); err != nil {
		return input, err
	}
	if err := decodeNullableString(raw, "jobSeekingStatus", &input.JobSeekingStatus); err != nil {
		return input, err
	}
	if err := decodeNullableString(raw, "profileColor", &input.ProfileColor); err != nil {
		return input, err
	}
	if err := decodeNullableString(raw, "avatarUrl", &input.AvatarURL); err != nil {
		return input, err
	}
	if err := decodeNullableString(raw, "coverPhotoUrl", &input.CoverPhotoURL); err != nil {
		return input, err
	}
	if v, ok := raw["isPublic"]; ok {
		var b *bool
		if err := json.Unmarshal(v, &b); err != nil || b == nil {
			return input, invalidField("isPublic")
		}
		input.IsPublic = b
	}
	return input, nil
}

// decodeNullableString decodes a field whose JSON value may be absent, null,
// or a string, into a **string. Absent → dst remains nil. Explicit null → dst
// points to a nil *string (clear). String → dst points to a *string with the value.
func decodeNullableString(raw map[string]json.RawMessage, key string, dst ***string) error {
	v, ok := raw[key]
	if !ok {
		return nil
	}
	var s *string
	if err := json.Unmarshal(v, &s); err != nil {
		return invalidField(key)
	}
	*dst = &s
	return nil
}

// UploadImage handles POST /api/users/:username/upload-image?type={avatar|cover}.
func (c *UserController) UploadImage(ctx echo.Context, username string) error {
	imageType := ctx.QueryParam("type")
	if imageType != "avatar" && imageType != "cover" {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "type must be 'avatar' or 'cover'"})
	}

	file, err := ctx.FormFile("file")
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "file is required"})
	}

	if file.Size > 5*1024*1024 {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "ファイルサイズは5MB以下にしてください"})
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "JPG、PNG、WebP形式のみ対応しています"})
	}

	src, err := file.Open()
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to open file"})
	}
	defer src.Close()

	key := fmt.Sprintf("user-images/%s_%s%s", uuid.New().String()[:8], imageType, ext)

	imageURL, err := c.storage.Save(ctx.Request().Context(), key, src)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to save file"})
	}

	var updateInput user.UpdateProfileInput
	if imageType == "avatar" {
		updateInput.AvatarURL = ptrPtr(imageURL)
	} else {
		updateInput.CoverPhotoURL = ptrPtr(imageURL)
	}

	in, p := c.newIO()
	if err := in.UpdateProfile(ctx.Request().Context(), username, updateInput); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, map[string]any{"url": imageURL, "user": p.Response()})
}

func ptrPtr(s string) **string {
	p := &s
	return &p
}

func (c *UserController) newIO() (port.UserInputPort, *presenter.UserPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(c.repoFactory(), output)
	return input, output
}
