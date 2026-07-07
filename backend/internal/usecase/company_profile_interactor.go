package usecase

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/company"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// CompanyProfileInteractor implements port.CompanyProfileInputPort.
type CompanyProfileInteractor struct {
	query port.CompanyProfileQueryService
	repo  port.CompanyProfileRepository
}

var _ port.CompanyProfileInputPort = (*CompanyProfileInteractor)(nil)

func NewCompanyProfileInteractor(query port.CompanyProfileQueryService, repo port.CompanyProfileRepository) *CompanyProfileInteractor {
	return &CompanyProfileInteractor{query: query, repo: repo}
}

func (i *CompanyProfileInteractor) GetProfile(ctx context.Context, companyID string) (*company.Profile, error) {
	return i.query.GetProfile(ctx, companyID)
}

func (i *CompanyProfileInteractor) GetPublicProfile(ctx context.Context, companyID string) (*company.Profile, error) {
	return i.query.GetApprovedProfile(ctx, companyID)
}

func (i *CompanyProfileInteractor) UpdateProfile(ctx context.Context, companyID string, input company.UpdateProfileInput) error {
	if err := company.ValidateUpdateProfile(input); err != nil {
		return err
	}
	return i.repo.UpdateProfile(ctx, companyID, input)
}

func (i *CompanyProfileInteractor) AddGalleryURL(ctx context.Context, companyID, url string) error {
	return i.repo.AppendGalleryURL(ctx, companyID, url)
}

func (i *CompanyProfileInteractor) RemoveGalleryURL(ctx context.Context, companyID, url string) error {
	return i.repo.RemoveGalleryURL(ctx, companyID, url)
}

func (i *CompanyProfileInteractor) SetImageURL(ctx context.Context, companyID string, kind company.ImageKind, url string) error {
	return i.repo.SetImageURL(ctx, companyID, kind, url)
}

func (i *CompanyProfileInteractor) ClearImageURL(ctx context.Context, companyID string, kind company.ImageKind) error {
	return i.repo.ClearImageURL(ctx, companyID, kind)
}
