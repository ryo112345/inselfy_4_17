package controller

import (
	"errors"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

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

func (c *CompanyProfileController) GetPublicProfile(ctx echo.Context) error {
	id := ctx.Param("id")
	if _, err := uuid.Parse(id); err != nil {
		return badRequest(ctx, "invalid company id")
	}

	profile, err := c.input.GetPublicProfile(ctx.Request().Context(), id)
	if err != nil {
		return notFoundError(ctx, "company not found")
	}
	return ctx.JSON(http.StatusOK, presenter.PublicCompanyProfile(profile))
}

func (c *CompanyProfileController) companyID(ctx echo.Context) string {
	return ctx.Get(authmw.CompanyIDKey).(string)
}

func (c *CompanyProfileController) GetProfile(ctx echo.Context) error {
	companyID := c.companyID(ctx)
	if _, err := uuid.Parse(companyID); err != nil {
		return badRequest(ctx, "invalid company id")
	}

	profile, err := c.input.GetProfile(ctx.Request().Context(), companyID)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.JSON(http.StatusOK, presenter.CompanyProfile(profile))
}

func (c *CompanyProfileController) UpdateProfile(ctx echo.Context) error {
	companyID := c.companyID(ctx)
	if _, err := uuid.Parse(companyID); err != nil {
		return badRequest(ctx, "invalid company id")
	}

	var body openapi.ModelsUpdateCompanyProfileRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request")
	}

	err := c.input.UpdateProfile(ctx.Request().Context(), companyID, company.UpdateProfileInput{
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
			return badRequest(ctx, err.Error())
		}
		return internalError(ctx, err.Error())
	}

	return c.GetProfile(ctx)
}

func (c *CompanyProfileController) UploadImage(ctx echo.Context) error {
	companyID := c.companyID(ctx)
	if _, err := uuid.Parse(companyID); err != nil {
		return badRequest(ctx, "invalid company id")
	}

	imageType := ctx.QueryParam("type")
	if imageType != "logo" && imageType != "cover" && imageType != "gallery" {
		return badRequest(ctx, "type must be 'logo', 'cover', or 'gallery'")
	}

	file, err := ctx.FormFile("file")
	if err != nil {
		return badRequest(ctx, "file is required")
	}

	if file.Size > 5*1024*1024 {
		return badRequest(ctx, "ファイルサイズは5MB以下にしてください")
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		return badRequest(ctx, "JPG、PNG、WebP形式のみ対応しています")
	}

	var key string
	if imageType == "gallery" {
		key = fmt.Sprintf("company-images/%s_gallery_%s%s", companyID, uuid.New().String()[:8], ext)
	} else {
		key = fmt.Sprintf("company-images/%s_%s%s", companyID, imageType, ext)
	}

	src, err := file.Open()
	if err != nil {
		return internalError(ctx, "failed to open file")
	}
	defer func() { _ = src.Close() }()

	imageURL, err := c.storage.Save(ctx.Request().Context(), key, src)
	if err != nil {
		return internalError(ctx, "failed to save file")
	}

	reqCtx := ctx.Request().Context()
	if imageType == "gallery" {
		err = c.input.AddGalleryURL(reqCtx, companyID, imageURL)
	} else {
		err = c.input.SetImageURL(reqCtx, companyID, imageKind(imageType), imageURL)
	}
	if err != nil {
		return internalError(ctx, err.Error())
	}

	return ctx.JSON(http.StatusOK, openapi.ModelsUploadUrlResponse{Url: imageURL})
}

func (c *CompanyProfileController) DeleteImage(ctx echo.Context) error {
	companyID := c.companyID(ctx)
	if _, err := uuid.Parse(companyID); err != nil {
		return badRequest(ctx, "invalid company id")
	}

	imageType := ctx.QueryParam("type")
	imageURL := ctx.QueryParam("url")
	reqCtx := ctx.Request().Context()

	switch imageType {
	case "gallery":
		if imageURL == "" {
			return badRequest(ctx, "url is required for gallery delete")
		}
		if err := c.input.RemoveGalleryURL(reqCtx, companyID, imageURL); err != nil {
			return internalError(ctx, err.Error())
		}
	case "logo", "cover":
		if err := c.input.ClearImageURL(reqCtx, companyID, imageKind(imageType)); err != nil {
			return internalError(ctx, err.Error())
		}
	default:
		return badRequest(ctx, "type must be 'logo', 'cover', or 'gallery'")
	}

	return ctx.NoContent(http.StatusNoContent)
}

func imageKind(imageType string) company.ImageKind {
	if imageType == "cover" {
		return company.ImageCover
	}
	return company.ImageLogo
}
