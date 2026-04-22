package presenter

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/auth"
	"github.com/akiyama/inselfy/backend/internal/domain/company"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CompanyAuthPresenter struct {
	tokenResponse      *CompanyAuthTokenResponse
	companyResponse    *CompanyResponse
	registeredResponse *CompanyResponse
}

type CompanyAuthTokenResponse struct {
	AccessToken  string
	RefreshToken string
	Company      *CompanyResponse
}

type CompanyResponse struct {
	ID                string    `json:"id"`
	Email             string    `json:"email"`
	CompanyName       string    `json:"companyName"`
	ContactPersonName string    `json:"contactPersonName"`
	PhoneNumber       string    `json:"phoneNumber"`
	Status            string    `json:"status"`
	CreatedAt         time.Time `json:"createdAt"`
}

var _ port.CompanyAuthOutputPort = (*CompanyAuthPresenter)(nil)

func NewCompanyAuthPresenter() *CompanyAuthPresenter {
	return &CompanyAuthPresenter{}
}

func (p *CompanyAuthPresenter) PresentTokenPair(_ context.Context, pair *auth.TokenPair, c *company.CompanyAccount) error {
	p.tokenResponse = &CompanyAuthTokenResponse{
		AccessToken:  pair.AccessToken,
		RefreshToken: pair.RefreshToken,
		Company:      toCompanyResponse(c),
	}
	return nil
}

func (p *CompanyAuthPresenter) PresentCompany(_ context.Context, c *company.CompanyAccount) error {
	p.companyResponse = toCompanyResponse(c)
	return nil
}

func (p *CompanyAuthPresenter) PresentRegistered(_ context.Context, c *company.CompanyAccount) error {
	p.registeredResponse = toCompanyResponse(c)
	return nil
}

func (p *CompanyAuthPresenter) TokenResponse() *CompanyAuthTokenResponse {
	return p.tokenResponse
}

func (p *CompanyAuthPresenter) CompanyResponse() *CompanyResponse {
	return p.companyResponse
}

func (p *CompanyAuthPresenter) RegisteredResponse() *CompanyResponse {
	return p.registeredResponse
}

func toCompanyResponse(c *company.CompanyAccount) *CompanyResponse {
	return &CompanyResponse{
		ID:                c.ID,
		Email:             c.Email,
		CompanyName:       c.CompanyName,
		ContactPersonName: c.ContactPersonName,
		PhoneNumber:       c.PhoneNumber,
		Status:            string(c.Status),
		CreatedAt:         c.CreatedAt,
	}
}
