package presenter

import "github.com/akiyama/inselfy/backend/internal/domain/company"

type CompanyProfileResponse struct {
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

type PublicCompanyProfileResponse struct {
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

func CompanyProfile(p *company.Profile) *CompanyProfileResponse {
	return &CompanyProfileResponse{
		ID:                   p.ID,
		CompanyName:          p.CompanyName,
		ContactPersonName:    p.ContactPersonName,
		PhoneNumber:          p.PhoneNumber,
		Email:                p.Email,
		Headline:             p.Headline,
		Description:          p.Description,
		Industry:             p.Industry,
		Location:             p.Location,
		EmployeeCount:        p.EmployeeCount,
		FoundedYear:          p.FoundedYear,
		FoundedMonth:         p.FoundedMonth,
		WebsiteURL:           p.WebsiteURL,
		LogoURL:              p.LogoURL,
		CoverImageURL:        p.CoverImageURL,
		RepresentativeName:   p.RepresentativeName,
		Capital:              p.Capital,
		Revenue:              p.Revenue,
		Benefits:             p.Benefits,
		AverageAge:           p.AverageAge,
		AverageOvertimeHours: p.AverageOvertimeHours,
		PaidLeaveRate:        p.PaidLeaveRate,
		SmokingPolicy:        p.SmokingPolicy,
		GalleryURLs:          p.GalleryURLs,
	}
}

func PublicCompanyProfile(p *company.Profile) *PublicCompanyProfileResponse {
	return &PublicCompanyProfileResponse{
		ID:                   p.ID,
		CompanyName:          p.CompanyName,
		Headline:             p.Headline,
		Description:          p.Description,
		Industry:             p.Industry,
		Location:             p.Location,
		EmployeeCount:        p.EmployeeCount,
		FoundedYear:          p.FoundedYear,
		FoundedMonth:         p.FoundedMonth,
		WebsiteURL:           p.WebsiteURL,
		LogoURL:              p.LogoURL,
		CoverImageURL:        p.CoverImageURL,
		RepresentativeName:   p.RepresentativeName,
		Capital:              p.Capital,
		Revenue:              p.Revenue,
		Benefits:             p.Benefits,
		AverageAge:           p.AverageAge,
		AverageOvertimeHours: p.AverageOvertimeHours,
		PaidLeaveRate:        p.PaidLeaveRate,
		SmokingPolicy:        p.SmokingPolicy,
		GalleryURLs:          p.GalleryURLs,
	}
}
