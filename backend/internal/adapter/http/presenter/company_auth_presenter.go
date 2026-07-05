package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/auth"
	"github.com/akiyama/inselfy/backend/internal/domain/company"
)

type CompanyAuthTokenResponse struct {
	AccessToken  string
	RefreshToken string
	Company      *openapi.ModelsCompanyResponse
}

// CompanyTokenResponse builds the token-pair API response (with embedded company).
func CompanyTokenResponse(pair *auth.TokenPair, c *company.CompanyAccount) any {
	return &CompanyAuthTokenResponse{
		AccessToken:  pair.AccessToken,
		RefreshToken: pair.RefreshToken,
		Company:      toCompanyResponse(c),
	}
}

// CompanyMeResponse builds the current-company API response.
func CompanyMeResponse(c *company.CompanyAccount) any {
	return toCompanyResponse(c)
}

// CompanyRegisteredResponse builds the newly-registered-company API response.
func CompanyRegisteredResponse(c *company.CompanyAccount) any {
	return toCompanyResponse(c)
}

func toCompanyResponse(c *company.CompanyAccount) *openapi.ModelsCompanyResponse {
	return &openapi.ModelsCompanyResponse{
		Id:                c.ID,
		Email:             c.Email,
		CompanyName:       c.CompanyName,
		ContactPersonName: c.ContactPersonName,
		PhoneNumber:       c.PhoneNumber,
		Status:            string(c.Status),
		CreatedAt:         c.CreatedAt,
	}
}
