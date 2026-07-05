package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/company"
)

// TeamDiagnoseInputPort defines the public team-diagnose use cases.
type TeamDiagnoseInputPort interface {
	GetByToken(ctx context.Context, token string) (*company.TeamDiagnoseInfo, error)
	UpdateStatus(ctx context.Context, token string, wvStatus, ciStatus *string) error
}

// TeamDiagnoseQueryService reads the diagnose page composite view.
type TeamDiagnoseQueryService interface {
	GetByInviteToken(ctx context.Context, token string) (*company.TeamDiagnoseInfo, error)
}

// TeamMemberRepository persists team-member state changes.
type TeamMemberRepository interface {
	MarkWVCompleted(ctx context.Context, inviteToken string) error
	MarkCICompleted(ctx context.Context, inviteToken string) error
}
