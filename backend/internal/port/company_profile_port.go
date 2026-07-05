package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/company"
)

// CompanyProfileInputPort defines company profile use cases.
type CompanyProfileInputPort interface {
	GetProfile(ctx context.Context, companyID string) (*company.Profile, error)
	GetPublicProfile(ctx context.Context, companyID string) (*company.Profile, error)
	UpdateProfile(ctx context.Context, companyID string, input company.UpdateProfileInput) error
	AddGalleryURL(ctx context.Context, companyID, url string) error
	RemoveGalleryURL(ctx context.Context, companyID, url string) error
	SetImageURL(ctx context.Context, companyID string, kind company.ImageKind, url string) error
	ClearImageURL(ctx context.Context, companyID string, kind company.ImageKind) error
}

// CompanyProfileQueryService reads company profiles.
type CompanyProfileQueryService interface {
	GetProfile(ctx context.Context, companyID string) (*company.Profile, error)
	// GetApprovedProfile returns the profile only when status = 'approved'.
	GetApprovedProfile(ctx context.Context, companyID string) (*company.Profile, error)
}

// CompanyProfileRepository persists company profile changes.
type CompanyProfileRepository interface {
	UpdateProfile(ctx context.Context, companyID string, input company.UpdateProfileInput) error
	AppendGalleryURL(ctx context.Context, companyID, url string) error
	RemoveGalleryURL(ctx context.Context, companyID, url string) error
	SetImageURL(ctx context.Context, companyID string, kind company.ImageKind, url string) error
	ClearImageURL(ctx context.Context, companyID string, kind company.ImageKind) error
}
