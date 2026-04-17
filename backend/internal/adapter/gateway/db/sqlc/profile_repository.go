package sqlc

import (
	"context"
	"fmt"
	"time"

	"github.com/akiyama/infonnect/backend/internal/adapter/gateway/db/sqlc/generated"
	"github.com/akiyama/infonnect/backend/internal/domain/profile"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type ProfileRepository struct {
	q *generated.Queries
}

func NewProfileRepository(q *generated.Queries) *ProfileRepository {
	return &ProfileRepository{q: q}
}

func (r *ProfileRepository) UpdateUserProfile(ctx context.Context, userID uuid.UUID, params profile.UpdateProfileParams) error {
	age := pgtype.Int2{}
	if params.Age != nil {
		age = pgtype.Int2{Int16: *params.Age, Valid: true}
	}
	_, err := r.q.UpdateUserProfile(ctx, generated.UpdateUserProfileParams{
		ID:               UUIDToPgtype(userID),
		Headline:         pgtype.Text{String: params.Headline, Valid: params.Headline != ""},
		Location:         pgtype.Text{String: params.Location, Valid: params.Location != ""},
		About:            pgtype.Text{String: params.About, Valid: params.About != ""},
		Age:              age,
		Industry:         pgtype.Text{String: params.Industry, Valid: params.Industry != ""},
		JobType:          pgtype.Text{String: params.JobType, Valid: params.JobType != ""},
		Url:              pgtype.Text{String: params.URL, Valid: params.URL != ""},
		ProfileColor:     pgtype.Text{String: params.ProfileColor, Valid: params.ProfileColor != ""},
		JobSeekingStatus: params.JobSeekingStatus,
	})
	return err
}

func (r *ProfileRepository) GetUserProfile(ctx context.Context, userID uuid.UUID) (*profile.UserProfile, error) {
	pgID := UUIDToPgtype(userID)

	u, err := r.q.GetUserByID(ctx, pgID)
	if err != nil {
		return nil, err
	}

	exps, err := r.q.ListExperiencesByUserID(ctx, pgID)
	if err != nil {
		return nil, err
	}

	edus, err := r.q.ListEducationsByUserID(ctx, pgID)
	if err != nil {
		return nil, err
	}

	skills, err := r.q.ListUserSkills(ctx, pgID)
	if err != nil {
		return nil, err
	}

	var age *int16
	if u.Age.Valid {
		v := u.Age.Int16
		age = &v
	}

	var profileUpdatedAt *time.Time
	if u.ProfileUpdatedAt.Valid {
		t := u.ProfileUpdatedAt.Time
		profileUpdatedAt = &t
	}

	p := &profile.UserProfile{
		ID:               PgtypeToUUID(u.ID),
		Username:         u.Username.String,
		DisplayName:      u.DisplayName.String,
		Email:            u.Email.String,
		Headline:         u.Headline.String,
		Location:         u.Location.String,
		About:            u.About.String,
		Age:              age,
		Industry:         u.Industry.String,
		JobType:          u.JobType.String,
		URL:              u.Url.String,
		ProfileColor:     u.ProfileColor.String,
		JobSeekingStatus: u.JobSeekingStatus,
		ProfileUpdatedAt: profileUpdatedAt,
		Experiences:      make([]profile.Experience, 0, len(exps)),
		Educations:       make([]profile.Education, 0, len(edus)),
		Skills:           make([]profile.Skill, 0, len(skills)),
	}

	for _, e := range exps {
		p.Experiences = append(p.Experiences, expToDomain(e))
	}
	for _, e := range edus {
		p.Educations = append(p.Educations, eduToDomain(e))
	}
	for _, s := range skills {
		p.Skills = append(p.Skills, profile.Skill{
			ID:   PgtypeToUUID(s.ID),
			Name: s.Name,
		})
	}

	return p, nil
}

func (r *ProfileRepository) ReplaceExperiences(ctx context.Context, userID uuid.UUID, inputs []profile.ExperienceInput) ([]profile.Experience, error) {
	pgID := UUIDToPgtype(userID)
	if err := r.q.DeleteExperiencesByUserID(ctx, pgID); err != nil {
		return nil, err
	}

	result := make([]profile.Experience, 0, len(inputs))
	for _, inp := range inputs {
		if inp.StartYear == nil || inp.StartMonth == nil {
			return nil, fmt.Errorf("start_year and start_month are required")
		}
		endYear := pgtype.Int2{}
		if inp.EndYear != nil {
			endYear = pgtype.Int2{Int16: *inp.EndYear, Valid: true}
		}
		endMonth := pgtype.Int2{}
		if inp.EndMonth != nil {
			endMonth = pgtype.Int2{Int16: *inp.EndMonth, Valid: true}
		}

		row, err := r.q.CreateExperience(ctx, generated.CreateExperienceParams{
			UserID:      pgID,
			CompanyName: inp.CompanyName,
			Title:       inp.Title,
			StartYear:   *inp.StartYear,
			StartMonth:  *inp.StartMonth,
			EndYear:     endYear,
			EndMonth:    endMonth,
			IsCurrent:   inp.IsCurrent,
			Location:    pgtype.Text{String: inp.Location, Valid: inp.Location != ""},
			Description: inp.Description,
		})
		if err != nil {
			return nil, err
		}
		result = append(result, expToDomain(row))
	}
	return result, nil
}

func (r *ProfileRepository) ReplaceEducations(ctx context.Context, userID uuid.UUID, inputs []profile.EducationInput) ([]profile.Education, error) {
	pgID := UUIDToPgtype(userID)
	if err := r.q.DeleteEducationsByUserID(ctx, pgID); err != nil {
		return nil, err
	}

	result := make([]profile.Education, 0, len(inputs))
	for _, inp := range inputs {
		startYear := pgtype.Int2{}
		if inp.StartYear != nil {
			startYear = pgtype.Int2{Int16: *inp.StartYear, Valid: true}
		}
		endYear := pgtype.Int2{}
		if inp.EndYear != nil {
			endYear = pgtype.Int2{Int16: *inp.EndYear, Valid: true}
		}

		row, err := r.q.CreateEducation(ctx, generated.CreateEducationParams{
			UserID:    pgID,
			School:    inp.School,
			Degree:    pgtype.Text{String: inp.Degree, Valid: inp.Degree != ""},
			StartYear: startYear,
			EndYear:   endYear,
		})
		if err != nil {
			return nil, err
		}
		result = append(result, eduToDomain(row))
	}
	return result, nil
}

func (r *ProfileRepository) ReplaceSkills(ctx context.Context, userID uuid.UUID, skillNames []string) ([]profile.Skill, error) {
	pgID := UUIDToPgtype(userID)
	if err := r.q.DeleteUserSkillsByUserID(ctx, pgID); err != nil {
		return nil, err
	}

	result := make([]profile.Skill, 0, len(skillNames))
	for _, name := range skillNames {
		skill, err := r.q.FindOrCreateSkill(ctx, name)
		if err != nil {
			return nil, err
		}
		if err := r.q.CreateUserSkill(ctx, generated.CreateUserSkillParams{
			UserID:  pgID,
			SkillID: skill.ID,
		}); err != nil {
			return nil, err
		}
		result = append(result, profile.Skill{
			ID:   PgtypeToUUID(skill.ID),
			Name: skill.Name,
		})
	}
	return result, nil
}

func expToDomain(e generated.Experience) profile.Experience {
	exp := profile.Experience{
		ID:          PgtypeToUUID(e.ID),
		UserID:      PgtypeToUUID(e.UserID),
		CompanyName: e.CompanyName,
		Title:       e.Title,
		StartYear:   e.StartYear,
		StartMonth:  e.StartMonth,
		IsCurrent:   e.IsCurrent,
		Location:    e.Location.String,
		Description: e.Description,
		CreatedAt:   e.CreatedAt.Time,
	}
	if e.EndYear.Valid {
		v := e.EndYear.Int16
		exp.EndYear = &v
	}
	if e.EndMonth.Valid {
		v := e.EndMonth.Int16
		exp.EndMonth = &v
	}
	return exp
}

func eduToDomain(e generated.Education) profile.Education {
	edu := profile.Education{
		ID:        PgtypeToUUID(e.ID),
		UserID:    PgtypeToUUID(e.UserID),
		School:    e.School,
		Degree:    e.Degree.String,
		CreatedAt: e.CreatedAt.Time,
	}
	if e.StartYear.Valid {
		v := e.StartYear.Int16
		edu.StartYear = &v
	}
	if e.EndYear.Valid {
		v := e.EndYear.Int16
		edu.EndYear = &v
	}
	return edu
}
