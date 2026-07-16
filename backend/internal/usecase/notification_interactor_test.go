package usecase_test

import (
	"context"
	"errors"
	"testing"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// markReadRecorder records the owner/id the interactor forwards to the repo and
// lets a test force the not-owned (ErrNotFound) path.
type markReadRecorder struct {
	notificationRepoStub
	gotUserID, gotCompanyID, gotID string
	err                            error
}

func (r *markReadRecorder) MarkAsReadByUserID(_ context.Context, userID, id string) error {
	r.gotUserID, r.gotID = userID, id
	return r.err
}

func (r *markReadRecorder) MarkAsReadByCompanyID(_ context.Context, companyID, id string) error {
	r.gotCompanyID, r.gotID = companyID, id
	return r.err
}

func TestNotificationInteractor_MarkAsReadByUser_ForwardsOwner(t *testing.T) {
	rec := &markReadRecorder{}
	it := usecase.NewNotificationInteractor(rec)

	if err := it.MarkAsReadByUser(context.Background(), "user-1", "notif-9"); err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	// The owner MUST reach the repo; dropping it reopens the IDOR.
	if rec.gotUserID != "user-1" || rec.gotID != "notif-9" {
		t.Fatalf("owner/id not forwarded: userID=%q id=%q", rec.gotUserID, rec.gotID)
	}
}

func TestNotificationInteractor_MarkAsReadByUser_PropagatesNotFound(t *testing.T) {
	rec := &markReadRecorder{err: domainerr.ErrNotFound}
	it := usecase.NewNotificationInteractor(rec)

	err := it.MarkAsReadByUser(context.Background(), "user-1", "someone-elses-notif")
	if !errors.Is(err, domainerr.ErrNotFound) {
		t.Fatalf("expected ErrNotFound for a notification the caller does not own, got %v", err)
	}
}

func TestNotificationInteractor_MarkAsReadByCompany_ForwardsOwner(t *testing.T) {
	rec := &markReadRecorder{}
	it := usecase.NewNotificationInteractor(rec)

	if err := it.MarkAsReadByCompany(context.Background(), "company-1", "notif-3"); err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if rec.gotCompanyID != "company-1" || rec.gotID != "notif-3" {
		t.Fatalf("owner/id not forwarded: companyID=%q id=%q", rec.gotCompanyID, rec.gotID)
	}
}
