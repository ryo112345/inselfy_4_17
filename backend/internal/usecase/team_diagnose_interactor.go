package usecase

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/company"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// TeamDiagnoseInteractor implements port.TeamDiagnoseInputPort.
type TeamDiagnoseInteractor struct {
	query   port.TeamDiagnoseQueryService
	members port.TeamMemberRepository
}

var _ port.TeamDiagnoseInputPort = (*TeamDiagnoseInteractor)(nil)

func NewTeamDiagnoseInteractor(query port.TeamDiagnoseQueryService, members port.TeamMemberRepository) *TeamDiagnoseInteractor {
	return &TeamDiagnoseInteractor{query: query, members: members}
}

func (i *TeamDiagnoseInteractor) GetByToken(ctx context.Context, token string) (*company.TeamDiagnoseInfo, error) {
	return i.query.GetByInviteToken(ctx, token)
}

func (i *TeamDiagnoseInteractor) UpdateStatus(ctx context.Context, token string, wvStatus, ciStatus *string) error {
	if wvStatus != nil {
		if *wvStatus != "completed" {
			return domainerr.NewValidation("wv_status must be 'completed'")
		}
		if err := i.members.MarkWVCompleted(ctx, token); err != nil {
			return err
		}
	}
	if ciStatus != nil {
		if *ciStatus != "completed" {
			return domainerr.NewValidation("ci_status must be 'completed'")
		}
		if err := i.members.MarkCICompleted(ctx, token); err != nil {
			return err
		}
	}
	return nil
}
