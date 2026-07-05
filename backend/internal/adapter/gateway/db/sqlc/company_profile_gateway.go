package sqlc

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/domain/company"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// CompanyProfileGateway implements both the profile query service and the
// profile repository against company_accounts.
type CompanyProfileGateway struct {
	pool *pgxpool.Pool
}

var (
	_ port.CompanyProfileQueryService = (*CompanyProfileGateway)(nil)
	_ port.CompanyProfileRepository   = (*CompanyProfileGateway)(nil)
)

func NewCompanyProfileGateway(pool *pgxpool.Pool) *CompanyProfileGateway {
	return &CompanyProfileGateway{pool: pool}
}

const profileColumns = `id, company_name, contact_person_name, phone_number, email,
	headline, description, industry, location, employee_count,
	founded_year, founded_month, website_url, logo_url, cover_image_url,
	representative_name, capital, revenue,
	benefits, average_age, average_overtime_hours, paid_leave_rate,
	smoking_policy, gallery_urls`

func (g *CompanyProfileGateway) GetProfile(ctx context.Context, companyID string) (*company.Profile, error) {
	return g.scanProfile(ctx,
		`SELECT `+profileColumns+` FROM company_accounts WHERE id = $1`, companyID)
}

func (g *CompanyProfileGateway) GetApprovedProfile(ctx context.Context, companyID string) (*company.Profile, error) {
	return g.scanProfile(ctx,
		`SELECT `+profileColumns+` FROM company_accounts WHERE id = $1 AND status = 'approved'`, companyID)
}

func (g *CompanyProfileGateway) scanProfile(ctx context.Context, query, companyID string) (*company.Profile, error) {
	var p company.Profile
	var foundedYear, foundedMonth *int32
	var benefitsJSON, galleryJSON []byte

	err := g.pool.QueryRow(ctx, query, lenientUUID(companyID)).
		Scan(&p.ID, &p.CompanyName, &p.ContactPersonName, &p.PhoneNumber, &p.Email,
			&p.Headline, &p.Description, &p.Industry, &p.Location, &p.EmployeeCount,
			&foundedYear, &foundedMonth, &p.WebsiteURL, &p.LogoURL, &p.CoverImageURL,
			&p.RepresentativeName, &p.Capital, &p.Revenue,
			&benefitsJSON, &p.AverageAge, &p.AverageOvertimeHours, &p.PaidLeaveRate,
			&p.SmokingPolicy, &galleryJSON)
	if err != nil {
		return nil, err
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
	return &p, nil
}

func (g *CompanyProfileGateway) UpdateProfile(ctx context.Context, companyID string, in company.UpdateProfileInput) error {
	benefitsJSON, _ := json.Marshal(in.Benefits)
	if in.Benefits == nil {
		benefitsJSON = []byte("[]")
	}

	_, err := g.pool.Exec(ctx,
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
		lenientUUID(companyID), in.CompanyName, in.ContactPersonName, in.PhoneNumber,
		in.Headline, in.Description, in.Industry, in.Location, in.EmployeeCount,
		in.FoundedYear, in.FoundedMonth, in.WebsiteURL,
		in.RepresentativeName, in.Capital, in.Revenue,
		string(benefitsJSON), in.AverageAge, in.AverageOvertimeHours,
		in.PaidLeaveRate, in.SmokingPolicy)
	return err
}

func (g *CompanyProfileGateway) AppendGalleryURL(ctx context.Context, companyID, url string) error {
	_, err := g.pool.Exec(ctx,
		`UPDATE company_accounts SET gallery_urls = gallery_urls || $2::jsonb, updated_at = NOW() WHERE id = $1`,
		lenientUUID(companyID), fmt.Sprintf(`[%q]`, url))
	return err
}

func (g *CompanyProfileGateway) RemoveGalleryURL(ctx context.Context, companyID, url string) error {
	_, err := g.pool.Exec(ctx,
		`UPDATE company_accounts
		 SET gallery_urls = (
			SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
			FROM jsonb_array_elements(gallery_urls) AS elem
			WHERE elem #>> '{}' != $2
		 ), updated_at = NOW()
		 WHERE id = $1`,
		lenientUUID(companyID), url)
	return err
}

func imageColumn(kind company.ImageKind) string {
	if kind == company.ImageCover {
		return "cover_image_url"
	}
	return "logo_url"
}

func (g *CompanyProfileGateway) SetImageURL(ctx context.Context, companyID string, kind company.ImageKind, url string) error {
	_, err := g.pool.Exec(ctx,
		fmt.Sprintf("UPDATE company_accounts SET %s = $2, updated_at = NOW() WHERE id = $1", imageColumn(kind)),
		lenientUUID(companyID), url)
	return err
}

func (g *CompanyProfileGateway) ClearImageURL(ctx context.Context, companyID string, kind company.ImageKind) error {
	_, err := g.pool.Exec(ctx,
		fmt.Sprintf("UPDATE company_accounts SET %s = '', updated_at = NOW() WHERE id = $1", imageColumn(kind)),
		lenientUUID(companyID))
	return err
}
