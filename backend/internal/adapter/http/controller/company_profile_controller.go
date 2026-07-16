package controller

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/google/uuid"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/company"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CompanyProfileController struct {
	input   port.CompanyProfileInputPort
	storage port.FileStorage
}

func NewCompanyProfileController(input port.CompanyProfileInputPort, storage port.FileStorage) *CompanyProfileController {
	return &CompanyProfileController{
		input:   input,
		storage: storage,
	}
}

// GetPublicProfile handles GET /api/companies/{id}.
func (c *CompanyProfileController) GetPublicProfile(ctx context.Context, req openapi.PublicCompanyProfilesGetPublicCompanyProfileRequestObject) (openapi.PublicCompanyProfilesGetPublicCompanyProfileResponseObject, error) {
	profile, err := c.input.GetPublicProfile(ctx, req.Id)
	if err != nil { //nolint:nilerr // 従来から取得エラーは一律 404（固定メッセージで存在秘匿）
		return openapi.PublicCompanyProfilesGetPublicCompanyProfile404JSONResponse(openapi.ModelsNotFoundError{
			Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
			Message: "company not found",
		}), nil
	}
	return openapi.PublicCompanyProfilesGetPublicCompanyProfile200JSONResponse(*presenter.PublicCompanyProfile(profile)), nil
}

// GetProfile handles GET /api/company/profile.
func (c *CompanyProfileController) GetProfile(ctx context.Context, _ openapi.CompanyProfilesGetCompanyProfileRequestObject) (openapi.CompanyProfilesGetCompanyProfileResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	profile, err := c.input.GetProfile(ctx, companyID)
	if err != nil {
		return nil, err
	}
	return openapi.CompanyProfilesGetCompanyProfile200JSONResponse(*presenter.CompanyProfile(profile)), nil
}

// UpdateProfile handles PUT /api/company/profile. 成功時は更新後のプロフィールを返す。
func (c *CompanyProfileController) UpdateProfile(ctx context.Context, req openapi.CompanyProfilesUpdateCompanyProfileRequestObject) (openapi.CompanyProfilesUpdateCompanyProfileResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CompanyProfilesUpdateCompanyProfile400JSONResponse(badRequestBody("invalid request")), nil
	}

	body := req.Body
	err := c.input.UpdateProfile(ctx, companyID, company.UpdateProfileInput{
		CompanyName:          body.CompanyName,
		ContactPersonName:    body.ContactPersonName,
		PhoneNumber:          body.PhoneNumber,
		Headline:             body.Headline,
		Description:          body.Description,
		Industry:             body.Industry,
		Location:             body.Location,
		EmployeeCount:        body.EmployeeCount,
		FoundedYear:          body.FoundedYear,
		FoundedMonth:         body.FoundedMonth,
		WebsiteURL:           body.WebsiteUrl,
		RepresentativeName:   body.RepresentativeName,
		Capital:              body.Capital,
		Revenue:              body.Revenue,
		Benefits:             body.Benefits,
		AverageAge:           body.AverageAge,
		AverageOvertimeHours: body.AverageOvertimeHours,
		PaidLeaveRate:        body.PaidLeaveRate,
		SmokingPolicy:        body.SmokingPolicy,
	})
	if err != nil {
		if errors.Is(err, domainerr.ErrBadRequest) {
			return openapi.CompanyProfilesUpdateCompanyProfile400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}

	profile, err := c.input.GetProfile(ctx, companyID)
	if err != nil {
		return nil, err
	}
	return openapi.CompanyProfilesUpdateCompanyProfile200JSONResponse(*presenter.CompanyProfile(profile)), nil
}

// UploadImage handles POST /api/company/profile/image.
func (c *CompanyProfileController) UploadImage(ctx context.Context, req openapi.CompanyProfilesUploadCompanyProfileImageRequestObject) (openapi.CompanyProfilesUploadCompanyProfileImageResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	imageType := req.Params.Type
	if imageType != "logo" && imageType != "cover" && imageType != "gallery" {
		return openapi.CompanyProfilesUploadCompanyProfileImage400JSONResponse(badRequestBody("type must be 'logo', 'cover', or 'gallery'")), nil
	}

	data, filename, _, err := readFilePart(req.Body, "file", 5*1024*1024)
	if err != nil {
		if errors.Is(err, errFilePartTooLarge) {
			return openapi.CompanyProfilesUploadCompanyProfileImage400JSONResponse(badRequestBody("ファイルサイズは5MB以下にしてください")), nil
		}
		return openapi.CompanyProfilesUploadCompanyProfileImage400JSONResponse(badRequestBody("file is required")), nil
	}

	ext := strings.ToLower(filepath.Ext(filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		return openapi.CompanyProfilesUploadCompanyProfileImage400JSONResponse(badRequestBody("JPG、PNG、WebP形式のみ対応しています")), nil
	}

	var key string
	if imageType == "gallery" {
		key = fmt.Sprintf("company-images/%s_gallery_%s%s", companyID, uuid.New().String()[:8], ext)
	} else {
		key = fmt.Sprintf("company-images/%s_%s%s", companyID, imageType, ext)
	}

	imageURL, err := c.storage.Save(ctx, key, bytes.NewReader(data))
	if err != nil {
		return nil, err
	}

	if imageType == "gallery" {
		err = c.input.AddGalleryURL(ctx, companyID, imageURL)
	} else {
		err = c.input.SetImageURL(ctx, companyID, imageKind(imageType), imageURL)
	}
	if err != nil {
		return nil, err
	}

	return openapi.CompanyProfilesUploadCompanyProfileImage200JSONResponse(openapi.ModelsUploadUrlResponse{Url: imageURL}), nil
}

// DeleteImage handles DELETE /api/company/profile/image.
func (c *CompanyProfileController) DeleteImage(ctx context.Context, req openapi.CompanyProfilesDeleteCompanyProfileImageRequestObject) (openapi.CompanyProfilesDeleteCompanyProfileImageResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	switch req.Params.Type {
	case "gallery":
		if req.Params.Url == nil || *req.Params.Url == "" {
			return openapi.CompanyProfilesDeleteCompanyProfileImage400JSONResponse(badRequestBody("url is required for gallery delete")), nil
		}
		if err := c.input.RemoveGalleryURL(ctx, companyID, *req.Params.Url); err != nil {
			return nil, err
		}
	case "logo", "cover":
		if err := c.input.ClearImageURL(ctx, companyID, imageKind(req.Params.Type)); err != nil {
			return nil, err
		}
	default:
		return openapi.CompanyProfilesDeleteCompanyProfileImage400JSONResponse(badRequestBody("type must be 'logo', 'cover', or 'gallery'")), nil
	}

	return openapi.CompanyProfilesDeleteCompanyProfileImage204Response{}, nil
}

func imageKind(imageType string) company.ImageKind {
	if imageType == "cover" {
		return company.ImageCover
	}
	return company.ImageLogo
}
