package controller

import (
	"encoding/json"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CompanyProfileController struct {
	pool    *pgxpool.Pool
	storage port.FileStorage
}

func NewCompanyProfileController(pool *pgxpool.Pool, storage port.FileStorage) *CompanyProfileController {
	return &CompanyProfileController{
		pool:    pool,
		storage: storage,
	}
}

type companyProfileResponse struct {
	ID                   string   `json:"id"`
	CompanyName          string   `json:"companyName"`
	ContactPersonName    string   `json:"contactPersonName"`
	PhoneNumber          string   `json:"phoneNumber"`
	Email                string   `json:"email"`
	Headline             string   `json:"headline"`
	Description          string   `json:"description"`
	Industry             string   `json:"industry"`
	Location             string   `json:"location"`
	EmployeeCount        string   `json:"employeeCount"`
	FoundedYear          *int     `json:"foundedYear"`
	FoundedMonth         *int     `json:"foundedMonth"`
	WebsiteURL           string   `json:"websiteUrl"`
	LogoURL              string   `json:"logoUrl"`
	CoverImageURL        string   `json:"coverImageUrl"`
	RepresentativeName   string   `json:"representativeName"`
	Capital              string   `json:"capital"`
	Revenue              string   `json:"revenue"`
	Benefits             []string `json:"benefits"`
	AverageAge           string   `json:"averageAge"`
	AverageOvertimeHours string   `json:"averageOvertimeHours"`
	PaidLeaveRate        string   `json:"paidLeaveRate"`
	SmokingPolicy        string   `json:"smokingPolicy"`
	GalleryURLs          []string `json:"galleryUrls"`
}

type publicCompanyProfileResponse struct {
	ID                   string   `json:"id"`
	CompanyName          string   `json:"companyName"`
	Headline             string   `json:"headline"`
	Description          string   `json:"description"`
	Industry             string   `json:"industry"`
	Location             string   `json:"location"`
	EmployeeCount        string   `json:"employeeCount"`
	FoundedYear          *int     `json:"foundedYear"`
	FoundedMonth         *int     `json:"foundedMonth"`
	WebsiteURL           string   `json:"websiteUrl"`
	LogoURL              string   `json:"logoUrl"`
	CoverImageURL        string   `json:"coverImageUrl"`
	RepresentativeName   string   `json:"representativeName"`
	Capital              string   `json:"capital"`
	Revenue              string   `json:"revenue"`
	Benefits             []string `json:"benefits"`
	AverageAge           string   `json:"averageAge"`
	AverageOvertimeHours string   `json:"averageOvertimeHours"`
	PaidLeaveRate        string   `json:"paidLeaveRate"`
	SmokingPolicy        string   `json:"smokingPolicy"`
	GalleryURLs          []string `json:"galleryUrls"`
}

func (c *CompanyProfileController) GetPublicProfile(ctx echo.Context) error {
	id := ctx.Param("id")
	parsed, err := uuid.Parse(id)
	if err != nil {
		return badRequest(ctx, "invalid company id")
	}

	var p publicCompanyProfileResponse
	var foundedYear, foundedMonth *int32
	var benefitsJSON, galleryJSON []byte
	err = c.pool.QueryRow(ctx.Request().Context(),
		`SELECT id, company_name,
				headline, description, industry, location, employee_count,
				founded_year, founded_month, website_url, logo_url, cover_image_url,
				representative_name, capital, revenue,
				benefits, average_age, average_overtime_hours, paid_leave_rate,
				smoking_policy, gallery_urls
		 FROM company_accounts WHERE id = $1 AND status = 'approved'`, parsed).
		Scan(&p.ID, &p.CompanyName,
			&p.Headline, &p.Description, &p.Industry, &p.Location, &p.EmployeeCount,
			&foundedYear, &foundedMonth, &p.WebsiteURL, &p.LogoURL, &p.CoverImageURL,
			&p.RepresentativeName, &p.Capital, &p.Revenue,
			&benefitsJSON, &p.AverageAge, &p.AverageOvertimeHours, &p.PaidLeaveRate,
			&p.SmokingPolicy, &galleryJSON)
	if err != nil {
		return notFoundError(ctx, "company not found")
	}
	if foundedYear != nil {
		v := int(*foundedYear)
		p.FoundedYear = &v
	}
	if foundedMonth != nil {
		v := int(*foundedMonth)
		p.FoundedMonth = &v
	}
	p.Benefits = []string{}
	if len(benefitsJSON) > 0 {
		_ = json.Unmarshal(benefitsJSON, &p.Benefits)
	}
	p.GalleryURLs = []string{}
	if len(galleryJSON) > 0 {
		_ = json.Unmarshal(galleryJSON, &p.GalleryURLs)
	}

	return ctx.JSON(http.StatusOK, p)
}

func (c *CompanyProfileController) companyID(ctx echo.Context) string {
	return ctx.Get(authmw.CompanyIDKey).(string)
}

func (c *CompanyProfileController) GetProfile(ctx echo.Context) error {
	companyID := c.companyID(ctx)
	parsed, err := uuid.Parse(companyID)
	if err != nil {
		return badRequest(ctx, "invalid company id")
	}

	var p companyProfileResponse
	var foundedYear, foundedMonth *int32
	var benefitsJSON, galleryJSON []byte
	err = c.pool.QueryRow(ctx.Request().Context(),
		`SELECT id, company_name, contact_person_name, phone_number, email,
				headline, description, industry, location, employee_count,
				founded_year, founded_month, website_url, logo_url, cover_image_url,
				representative_name, capital, revenue,
				benefits, average_age, average_overtime_hours, paid_leave_rate,
				smoking_policy, gallery_urls
		 FROM company_accounts WHERE id = $1`, parsed).
		Scan(&p.ID, &p.CompanyName, &p.ContactPersonName, &p.PhoneNumber, &p.Email,
			&p.Headline, &p.Description, &p.Industry, &p.Location, &p.EmployeeCount,
			&foundedYear, &foundedMonth, &p.WebsiteURL, &p.LogoURL, &p.CoverImageURL,
			&p.RepresentativeName, &p.Capital, &p.Revenue,
			&benefitsJSON, &p.AverageAge, &p.AverageOvertimeHours, &p.PaidLeaveRate,
			&p.SmokingPolicy, &galleryJSON)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	if foundedYear != nil {
		v := int(*foundedYear)
		p.FoundedYear = &v
	}
	if foundedMonth != nil {
		v := int(*foundedMonth)
		p.FoundedMonth = &v
	}
	p.Benefits = []string{}
	if len(benefitsJSON) > 0 {
		_ = json.Unmarshal(benefitsJSON, &p.Benefits)
	}
	p.GalleryURLs = []string{}
	if len(galleryJSON) > 0 {
		_ = json.Unmarshal(galleryJSON, &p.GalleryURLs)
	}

	return ctx.JSON(http.StatusOK, p)
}

func (c *CompanyProfileController) UpdateProfile(ctx echo.Context) error {
	companyID := c.companyID(ctx)
	parsed, err := uuid.Parse(companyID)
	if err != nil {
		return badRequest(ctx, "invalid company id")
	}

	var body struct {
		CompanyName          string   `json:"companyName"`
		ContactPersonName    string   `json:"contactPersonName"`
		PhoneNumber          string   `json:"phoneNumber"`
		Headline             string   `json:"headline"`
		Description          string   `json:"description"`
		Industry             string   `json:"industry"`
		Location             string   `json:"location"`
		EmployeeCount        string   `json:"employeeCount"`
		FoundedYear          *int     `json:"foundedYear"`
		FoundedMonth         *int     `json:"foundedMonth"`
		WebsiteURL           string   `json:"websiteUrl"`
		RepresentativeName   string   `json:"representativeName"`
		Capital              string   `json:"capital"`
		Revenue              string   `json:"revenue"`
		Benefits             []string `json:"benefits"`
		AverageAge           string   `json:"averageAge"`
		AverageOvertimeHours string   `json:"averageOvertimeHours"`
		PaidLeaveRate        string   `json:"paidLeaveRate"`
		SmokingPolicy        string   `json:"smokingPolicy"`
	}
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request")
	}

	if strings.TrimSpace(body.CompanyName) == "" {
		return badRequest(ctx, "企業名は必須です")
	}

	benefitsJSON, _ := json.Marshal(body.Benefits)
	if body.Benefits == nil {
		benefitsJSON = []byte("[]")
	}

	_, err = c.pool.Exec(ctx.Request().Context(),
		`UPDATE company_accounts SET
			company_name = $2,
			contact_person_name = $3,
			phone_number = $4,
			headline = $5,
			description = $6,
			industry = $7,
			location = $8,
			employee_count = $9,
			founded_year = $10,
			founded_month = $11,
			website_url = $12,
			representative_name = $13,
			capital = $14,
			revenue = $15,
			benefits = $16,
			average_age = $17,
			average_overtime_hours = $18,
			paid_leave_rate = $19,
			smoking_policy = $20,
			updated_at = NOW()
		 WHERE id = $1`,
		parsed, body.CompanyName, body.ContactPersonName, body.PhoneNumber,
		body.Headline, body.Description, body.Industry, body.Location, body.EmployeeCount,
		body.FoundedYear, body.FoundedMonth, body.WebsiteURL,
		body.RepresentativeName, body.Capital, body.Revenue,
		string(benefitsJSON), body.AverageAge, body.AverageOvertimeHours,
		body.PaidLeaveRate, body.SmokingPolicy)
	if err != nil {
		return internalError(ctx, err.Error())
	}

	return c.GetProfile(ctx)
}

func (c *CompanyProfileController) UploadImage(ctx echo.Context) error {
	companyID := c.companyID(ctx)
	parsed, err := uuid.Parse(companyID)
	if err != nil {
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
	defer src.Close()

	imageURL, err := c.storage.Save(ctx.Request().Context(), key, src)
	if err != nil {
		return internalError(ctx, "failed to save file")
	}

	if imageType == "gallery" {
		_, err = c.pool.Exec(ctx.Request().Context(),
			`UPDATE company_accounts SET gallery_urls = gallery_urls || $2::jsonb, updated_at = NOW() WHERE id = $1`,
			parsed, fmt.Sprintf(`[%q]`, imageURL))
		if err != nil {
			return internalError(ctx, err.Error())
		}
	} else {
		column := "logo_url"
		if imageType == "cover" {
			column = "cover_image_url"
		}
		_, err = c.pool.Exec(ctx.Request().Context(),
			fmt.Sprintf("UPDATE company_accounts SET %s = $2, updated_at = NOW() WHERE id = $1", column),
			parsed, imageURL)
		if err != nil {
			return internalError(ctx, err.Error())
		}
	}

	return ctx.JSON(http.StatusOK, map[string]string{"url": imageURL})
}

func (c *CompanyProfileController) DeleteImage(ctx echo.Context) error {
	companyID := c.companyID(ctx)
	parsed, err := uuid.Parse(companyID)
	if err != nil {
		return badRequest(ctx, "invalid company id")
	}

	imageType := ctx.QueryParam("type")
	imageURL := ctx.QueryParam("url")

	if imageType == "gallery" {
		if imageURL == "" {
			return badRequest(ctx, "url is required for gallery delete")
		}
		_, err = c.pool.Exec(ctx.Request().Context(),
			`UPDATE company_accounts
			 SET gallery_urls = (
				SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
				FROM jsonb_array_elements(gallery_urls) AS elem
				WHERE elem #>> '{}' != $2
			 ), updated_at = NOW()
			 WHERE id = $1`,
			parsed, imageURL)
		if err != nil {
			return internalError(ctx, err.Error())
		}
	} else if imageType == "logo" || imageType == "cover" {
		column := "logo_url"
		if imageType == "cover" {
			column = "cover_image_url"
		}
		_, err = c.pool.Exec(ctx.Request().Context(),
			fmt.Sprintf("UPDATE company_accounts SET %s = '', updated_at = NOW() WHERE id = $1", column),
			parsed)
		if err != nil {
			return internalError(ctx, err.Error())
		}
	} else {
		return badRequest(ctx, "type must be 'logo', 'cover', or 'gallery'")
	}

	return ctx.NoContent(http.StatusNoContent)
}
