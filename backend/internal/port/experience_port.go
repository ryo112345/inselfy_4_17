package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/experience"
)

// ExperienceInputPort defines experience use case input methods.
type ExperienceInputPort interface {
	Create(ctx context.Context, username string, input experience.CreateInput) (*experience.Experience, error)
	Update(ctx context.Context, username, experienceID string, input experience.UpdateInput) (*experience.Experience, error)
	Delete(ctx context.Context, username, experienceID string) error
	List(ctx context.Context, username string) ([]*experience.Experience, error)
}

// ExperienceRepository abstracts experience persistence.
type ExperienceRepository interface {
	Create(ctx context.Context, e *experience.Experience) (*experience.Experience, error)
	Update(ctx context.Context, e *experience.Experience) (*experience.Experience, error)
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*experience.Experience, error)
	ListByUserID(ctx context.Context, userID string) ([]*experience.Experience, error)
	CountByUserID(ctx context.Context, userID string) (int64, error)
}
