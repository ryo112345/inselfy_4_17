package controller

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
)

type CompanyProfileController struct {
	pool       *pgxpool.Pool
	uploadDir  string
	uploadBase string
}

func NewCompanyProfileController(pool *pgxpool.Pool) *CompanyProfileController {
	return &CompanyProfileController{
		pool:       pool,
		uploadDir:  "./uploads/company-images",
		uploadBase: "/api/uploads/company-images",
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
	Benefits             string   `json:"benefits"`
	AverageAge           string   `json:"averageAge"`
	AverageOvertimeHours string   `json:"averageOvertimeHours"`
	PaidLeaveRate        string   `json:"paidLeaveRate"`
	SmokingPolicy        string   `json:"smokingPolicy"`
	GalleryURLs          []string `json:"galleryUrls"`
}

func (c *CompanyProfileController) companyID(ctx echo.Context) string {
	return ctx.Get(authmw.CompanyIDKey).(string)
}

func (c *CompanyProfileController) GetProfile(ctx echo.Context) error {
	companyID := c.companyID(ctx)
	parsed, err := uuid.Parse(companyID)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid company id"})
	}

	var p companyProfileResponse
	var foundedYear, foundedMonth *int32
	var galleryJSON []byte
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
			&p.Benefits, &p.AverageAge, &p.AverageOvertimeHours, &p.PaidLeaveRate,
			&p.SmokingPolicy, &galleryJSON)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	if foundedYear != nil {
		v := int(*foundedYear)
		p.FoundedYear = &v
	}
	if foundedMonth != nil {
		v := int(*foundedMonth)
		p.FoundedMonth = &v
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
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid company id"})
	}

	var body struct {
		CompanyName          string `json:"companyName"`
		ContactPersonName    string `json:"contactPersonName"`
		PhoneNumber          string `json:"phoneNumber"`
		Headline             string `json:"headline"`
		Description          string `json:"description"`
		Industry             string `json:"industry"`
		Location             string `json:"location"`
		EmployeeCount        string `json:"employeeCount"`
		FoundedYear          *int   `json:"foundedYear"`
		FoundedMonth         *int   `json:"foundedMonth"`
		WebsiteURL           string `json:"websiteUrl"`
		RepresentativeName   string `json:"representativeName"`
		Capital              string `json:"capital"`
		Revenue              string `json:"revenue"`
		Benefits             string `json:"benefits"`
		AverageAge           string `json:"averageAge"`
		AverageOvertimeHours string `json:"averageOvertimeHours"`
		PaidLeaveRate        string `json:"paidLeaveRate"`
		SmokingPolicy        string `json:"smokingPolicy"`
	}
	if err := ctx.Bind(&body); err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid request"})
	}

	if strings.TrimSpace(body.CompanyName) == "" {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "企業名は必須です"})
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
		body.Benefits, body.AverageAge, body.AverageOvertimeHours,
		body.PaidLeaveRate, body.SmokingPolicy)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	return c.GetProfile(ctx)
}

func (c *CompanyProfileController) UploadImage(ctx echo.Context) error {
	companyID := c.companyID(ctx)
	parsed, err := uuid.Parse(companyID)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid company id"})
	}

	imageType := ctx.QueryParam("type")
	if imageType != "logo" && imageType != "cover" && imageType != "gallery" {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "type must be 'logo', 'cover', or 'gallery'"})
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

	if err := os.MkdirAll(c.uploadDir, 0o755); err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to create upload dir"})
	}

	var filename string
	if imageType == "gallery" {
		filename = fmt.Sprintf("%s_gallery_%s%s", companyID, uuid.New().String()[:8], ext)
	} else {
		filename = fmt.Sprintf("%s_%s%s", companyID, imageType, ext)
	}
	dst := filepath.Join(c.uploadDir, filename)

	src, err := file.Open()
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to open file"})
	}
	defer src.Close()

	out, err := os.Create(dst)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to save file"})
	}
	defer out.Close()

	if _, err := io.Copy(out, src); err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to write file"})
	}

	imageURL := c.uploadBase + "/" + filename

	if imageType == "gallery" {
		_, err = c.pool.Exec(ctx.Request().Context(),
			`UPDATE company_accounts SET gallery_urls = gallery_urls || $2::jsonb, updated_at = NOW() WHERE id = $1`,
			parsed, fmt.Sprintf(`[%q]`, imageURL))
		if err != nil {
			return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
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
			return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
		}
	}

	return ctx.JSON(http.StatusOK, map[string]string{"url": imageURL})
}

func (c *CompanyProfileController) DeleteImage(ctx echo.Context) error {
	companyID := c.companyID(ctx)
	parsed, err := uuid.Parse(companyID)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "invalid company id"})
	}

	imageType := ctx.QueryParam("type")
	imageURL := ctx.QueryParam("url")

	if imageType == "gallery" {
		if imageURL == "" {
			return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "url is required for gallery delete"})
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
			return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
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
			return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
		}
	} else {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "type must be 'logo', 'cover', or 'gallery'"})
	}

	return ctx.NoContent(http.StatusNoContent)
}
