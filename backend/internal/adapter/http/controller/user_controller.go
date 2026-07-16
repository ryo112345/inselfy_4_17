// Package controller contains HTTP controllers.
package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/google/uuid"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// UserController handles user HTTP endpoints.
type UserController struct {
	input   port.UserInputPort
	storage port.FileStorage
}

// NewUserController creates a UserController.
func NewUserController(input port.UserInputPort, storage port.FileStorage) *UserController {
	return &UserController{input: input, storage: storage}
}

// Create handles POST /api/users.
func (c *UserController) Create(ctx context.Context, req openapi.UsersCreateUserRequestObject) (openapi.UsersCreateUserResponseObject, error) {
	usr, err := c.input.Create(ctx, user.CreateUserInput{
		Name:     req.Body.Name,
		Username: req.Body.Username,
	})
	if err != nil {
		switch errorStatus(err) {
		case http.StatusConflict:
			return openapi.UsersCreateUser409JSONResponse(conflictBody(err)), nil
		case http.StatusBadRequest:
			return openapi.UsersCreateUser400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.UsersCreateUser201JSONResponse(presenter.UserResponse(usr)), nil
}

// GetByUsername handles GET /api/users/{username}.
func (c *UserController) GetByUsername(ctx context.Context, req openapi.UsersGetUserByUsernameRequestObject) (openapi.UsersGetUserByUsernameResponseObject, error) {
	usr, err := c.input.GetByUsername(ctx, req.Username)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.UsersGetUserByUsername404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.UsersGetUserByUsername400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.UsersGetUserByUsername200JSONResponse(presenter.UserResponse(usr)), nil
}

// GetByID handles GET /api/users/id/{id}.
func (c *UserController) GetByID(ctx context.Context, req openapi.UsersGetUserByIdRequestObject) (openapi.UsersGetUserByIdResponseObject, error) {
	usr, err := c.input.GetByID(ctx, req.Id)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.UsersGetUserById404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.UsersGetUserById400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.UsersGetUserById200JSONResponse(presenter.UserResponse(usr)), nil
}

// UpdateProfileHTTP handles PATCH /api/users/{username}.
//
// 例外的に strict wrapper を経由しない手書き net/http ハンドラ
// （docs/strict-server-migration.md Phase 3 実施メモ）。この operation は
// 「フィールド不在（触らない）」と「明示的な null（クリアする）」を区別する
// 必要があり、strict の事前デコード済みボディ（*string）では表現できない。
// リクエストの契約検証は上流の OpenAPI validator が行っている。
//
// We read the request body into map[string]json.RawMessage so we can
// distinguish "field absent" from "field explicitly null". Absent keys become
// nil pointers (do not touch), while explicit null becomes **string with *
// nil (clear to null).
func (c *UserController) UpdateProfileHTTP(w http.ResponseWriter, r *http.Request) {
	raw := map[string]json.RawMessage{}
	if err := json.NewDecoder(r.Body).Decode(&raw); err != nil {
		writeJSON(w, http.StatusBadRequest, badRequestBody("invalid body"))
		return
	}
	input, err := decodeUpdateProfile(raw)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, badRequestBody(err.Error()))
		return
	}
	usr, err := c.input.UpdateProfile(r.Context(), authmw.UserIDFromContext(r.Context()), r.PathValue("username"), input)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, presenter.UserResponse(usr))
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

// UploadImage handles POST /api/users/{username}/upload-image?type={avatar|cover}.
func (c *UserController) UploadImage(ctx context.Context, req openapi.UsersUploadUserImageRequestObject) (openapi.UsersUploadUserImageResponseObject, error) {
	// Verify ownership before doing any upload work, so a foreign caller can't
	// leave an orphaned file in storage (UpdateProfile below re-checks too).
	target, err := c.input.GetByUsername(ctx, req.Username)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.UsersUploadUserImage404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.UsersUploadUserImage400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	if target.ID != authmw.UserIDFromContext(ctx) {
		return openapi.UsersUploadUserImage403JSONResponse(forbiddenBody(port.ErrForbidden)), nil
	}

	data, filename, _, err := readFilePart(req.Body, "file", 5*1024*1024)
	switch {
	case errors.Is(err, errFilePartMissing):
		return openapi.UsersUploadUserImage400JSONResponse(badRequestBody("file is required")), nil
	case errors.Is(err, errFilePartTooLarge):
		return openapi.UsersUploadUserImage400JSONResponse(badRequestBody("ファイルサイズは5MB以下にしてください")), nil
	case err != nil:
		return nil, err
	}

	ext := strings.ToLower(filepath.Ext(filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		return openapi.UsersUploadUserImage400JSONResponse(badRequestBody("JPG、PNG、WebP形式のみ対応しています")), nil
	}

	key := fmt.Sprintf("user-images/%s_%s%s", uuid.New().String()[:8], req.Params.Type, ext)

	imageURL, err := c.storage.Save(ctx, key, bytes.NewReader(data))
	if err != nil {
		return nil, errors.New("failed to save file")
	}

	var updateInput user.UpdateProfileInput
	if req.Params.Type == openapi.UsersUploadUserImageParamsTypeAvatar {
		updateInput.AvatarURL = ptrPtr(imageURL)
	} else {
		updateInput.CoverPhotoURL = ptrPtr(imageURL)
	}

	usr, err := c.input.UpdateProfile(ctx, target.ID, req.Username, updateInput)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.UsersUploadUserImage404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.UsersUploadUserImage403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.UsersUploadUserImage400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.UsersUploadUserImage200JSONResponse(openapi.ModelsUserImageUploadResponse{
		Url:  imageURL,
		User: presenter.UserResponse(usr),
	}), nil
}

func ptrPtr(s string) **string {
	p := &s
	return &p
}
