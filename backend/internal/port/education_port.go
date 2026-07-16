package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/education"
)

// EducationInputPort defines education use case input methods.
type EducationInputPort interface {
	Create(ctx context.Context, authUserID, username string, input education.CreateInput) (*education.Education, error)
	Update(ctx context.Context, authUserID, username, educationID string, input education.UpdateInput) (*education.Education, error)
	Delete(ctx context.Context, authUserID, username, educationID string) error
	List(ctx context.Context, username string) ([]*education.Education, error)
}

// EducationRepository abstracts education persistence.
type EducationRepository interface {
	Create(ctx context.Context, e *education.Education) (*education.Education, error)
	Update(ctx context.Context, e *education.Education) (*education.Education, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*education.Education, error)
	ListByUserID(ctx context.Context, userID string) ([]*education.Education, error)
	CountByUserID(ctx context.Context, userID string) (int64, error)
}
