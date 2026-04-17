package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/education"
)

// EducationInputPort defines education use case input methods.
type EducationInputPort interface {
	Create(ctx context.Context, username string, input education.CreateInput) error
	Update(ctx context.Context, username, educationID string, input education.UpdateInput) error
	Delete(ctx context.Context, username, educationID string) error
	List(ctx context.Context, username string) error
}

// EducationOutputPort defines presenter methods for educations.
type EducationOutputPort interface {
	PresentEducation(ctx context.Context, e *education.Education) error
	PresentEducations(ctx context.Context, es []*education.Education) error
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
