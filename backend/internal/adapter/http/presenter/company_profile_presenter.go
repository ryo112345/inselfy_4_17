package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/company"
)

func CompanyProfile(p *company.Profile) *openapi.ModelsCompanyProfileResponse {
	return &openapi.ModelsCompanyProfileResponse{
		Id:                   p.ID,
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
		WebsiteUrl:           p.WebsiteURL,
		LogoUrl:              p.LogoURL,
		CoverImageUrl:        p.CoverImageURL,
		RepresentativeName:   p.RepresentativeName,
		Capital:              p.Capital,
		Revenue:              p.Revenue,
		Benefits:             p.Benefits,
		AverageAge:           p.AverageAge,
		AverageOvertimeHours: p.AverageOvertimeHours,
		PaidLeaveRate:        p.PaidLeaveRate,
		SmokingPolicy:        p.SmokingPolicy,
		GalleryUrls:          p.GalleryURLs,
	}
}

func PublicCompanyProfile(p *company.Profile) *openapi.ModelsPublicCompanyProfileResponse {
	return &openapi.ModelsPublicCompanyProfileResponse{
		Id:                   p.ID,
		CompanyName:          p.CompanyName,
		Headline:             p.Headline,
		Description:          p.Description,
		Industry:             p.Industry,
		Location:             p.Location,
		EmployeeCount:        p.EmployeeCount,
		FoundedYear:          p.FoundedYear,
		FoundedMonth:         p.FoundedMonth,
		WebsiteUrl:           p.WebsiteURL,
		LogoUrl:              p.LogoURL,
		CoverImageUrl:        p.CoverImageURL,
		RepresentativeName:   p.RepresentativeName,
		Capital:              p.Capital,
		Revenue:              p.Revenue,
		Benefits:             p.Benefits,
		AverageAge:           p.AverageAge,
		AverageOvertimeHours: p.AverageOvertimeHours,
		PaidLeaveRate:        p.PaidLeaveRate,
		SmokingPolicy:        p.SmokingPolicy,
		GalleryUrls:          p.GalleryURLs,
	}
}
