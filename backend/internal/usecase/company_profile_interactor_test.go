package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/akiyama/inselfy/backend/internal/domain/company"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

type companyProfileRepoStub struct {
	updateCalls int
}

func (s *companyProfileRepoStub) UpdateProfile(context.Context, string, company.UpdateProfileInput) error {
	s.updateCalls++
	return nil
}
func (s *companyProfileRepoStub) AppendGalleryURL(context.Context, string, string) error { return nil }
func (s *companyProfileRepoStub) RemoveGalleryURL(context.Context, string, string) error { return nil }
func (s *companyProfileRepoStub) SetImageURL(context.Context, string, company.ImageKind, string) error {
	return nil
}
func (s *companyProfileRepoStub) ClearImageURL(context.Context, string, company.ImageKind) error {
	return nil
}

func TestCompanyProfileInteractor_UpdateProfile_RequiresName(t *testing.T) {
	repo := &companyProfileRepoStub{}
	itr := usecase.NewCompanyProfileInteractor(nil, repo)

	err := itr.UpdateProfile(context.Background(), "co1", company.UpdateProfileInput{CompanyName: "  "})
	if !errors.Is(err, domainerr.ErrBadRequest) {
		t.Fatalf("want ErrBadRequest, got %v", err)
	}
	if err.Error() != "企業名は必須です" {
		t.Fatalf("want message 企業名は必須です, got %q", err.Error())
	}
	if repo.updateCalls != 0 {
		t.Fatalf("repo must not be called on validation failure")
	}

	if err := itr.UpdateProfile(context.Background(), "co1", company.UpdateProfileInput{CompanyName: "Acme"}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.updateCalls != 1 {
		t.Fatalf("want 1 update call, got %d", repo.updateCalls)
	}
}
