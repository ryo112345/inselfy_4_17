package usecase_test

import (
	"context"
	"errors"
	"testing"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

type teamMemberRepoStub struct {
	wvCalls int
	ciCalls int
	wvErr   error
	ciErr   error
}

func (s *teamMemberRepoStub) MarkWVCompleted(_ context.Context, _ string) error {
	s.wvCalls++
	return s.wvErr
}

func (s *teamMemberRepoStub) MarkCICompleted(_ context.Context, _ string) error {
	s.ciCalls++
	return s.ciErr
}

func strPtr(s string) *string { return &s }

func TestTeamDiagnoseInteractor_UpdateStatus(t *testing.T) {
	tests := []struct {
		name        string
		wvStatus    *string
		ciStatus    *string
		wvErr       error
		wantErr     error
		wantErrMsg  string
		wantWVCalls int
		wantCICalls int
	}{
		{
			name:        "both completed",
			wvStatus:    strPtr("completed"),
			ciStatus:    strPtr("completed"),
			wantWVCalls: 1,
			wantCICalls: 1,
		},
		{
			name:        "nil statuses are no-op",
			wantWVCalls: 0,
			wantCICalls: 0,
		},
		{
			name:       "invalid wv_status rejected before repo call",
			wvStatus:   strPtr("pending"),
			ciStatus:   strPtr("completed"),
			wantErr:    domainerr.ErrBadRequest,
			wantErrMsg: "wv_status must be 'completed'",
		},
		{
			name:        "invalid ci_status rejected after wv update",
			wvStatus:    strPtr("completed"),
			ciStatus:    strPtr("pending"),
			wantErr:     domainerr.ErrBadRequest,
			wantErrMsg:  "ci_status must be 'completed'",
			wantWVCalls: 1,
		},
		{
			name:        "member not found propagates",
			wvStatus:    strPtr("completed"),
			wvErr:       domainerr.ErrNotFound,
			wantErr:     domainerr.ErrNotFound,
			wantWVCalls: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &teamMemberRepoStub{wvErr: tt.wvErr}
			itr := usecase.NewTeamDiagnoseInteractor(nil, repo)

			err := itr.UpdateStatus(context.Background(), "token", tt.wvStatus, tt.ciStatus)

			if tt.wantErr == nil {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
			} else {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("want error %v, got %v", tt.wantErr, err)
				}
				if tt.wantErrMsg != "" && err.Error() != tt.wantErrMsg {
					t.Fatalf("want message %q, got %q", tt.wantErrMsg, err.Error())
				}
			}
			if repo.wvCalls != tt.wantWVCalls || repo.ciCalls != tt.wantCICalls {
				t.Fatalf("want calls wv=%d ci=%d, got wv=%d ci=%d",
					tt.wantWVCalls, tt.wantCICalls, repo.wvCalls, repo.ciCalls)
			}
		})
	}
}
