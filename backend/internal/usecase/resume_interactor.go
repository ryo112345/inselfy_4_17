package usecase

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/education"
	"github.com/akiyama/inselfy/backend/internal/domain/experience"
	"github.com/akiyama/inselfy/backend/internal/domain/notification"
	"github.com/akiyama/inselfy/backend/internal/domain/resume"
	"github.com/akiyama/inselfy/backend/internal/domain/skill"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// ResumeInteractor handles resume-upload use cases. Approve is the heavy
// path: it validates the stored draft and applies it to the whole profile
// (experiences/educations replaced, skills added) in one transaction.
type ResumeInteractor struct {
	repo             port.ResumeRepository
	userRepo         port.UserRepository
	experienceRepo   port.ExperienceRepository
	educationRepo    port.EducationRepository
	skillRepo        port.SkillRepository
	notificationRepo port.NotificationRepository
	tx               port.TxManager
}

var _ port.ResumeInputPort = (*ResumeInteractor)(nil)

// NewResumeInteractor creates a ResumeInteractor.
func NewResumeInteractor(
	repo port.ResumeRepository,
	userRepo port.UserRepository,
	experienceRepo port.ExperienceRepository,
	educationRepo port.EducationRepository,
	skillRepo port.SkillRepository,
	notificationRepo port.NotificationRepository,
	tx port.TxManager,
) *ResumeInteractor {
	return &ResumeInteractor{
		repo:             repo,
		userRepo:         userRepo,
		experienceRepo:   experienceRepo,
		educationRepo:    educationRepo,
		skillRepo:        skillRepo,
		notificationRepo: notificationRepo,
		tx:               tx,
	}
}

// CreateUpload registers an uploaded resume PDF for the user.
func (i *ResumeInteractor) CreateUpload(ctx context.Context, userID, originalFilename, storageKey string) (*resume.Upload, error) {
	return i.repo.Create(ctx, userID, originalFilename, storageKey)
}

// GetMine returns the user's latest upload (domainerr.ErrNotFound if none).
func (i *ResumeInteractor) GetMine(ctx context.Context, userID string) (*resume.Upload, error) {
	return i.repo.GetLatestByUserID(ctx, userID)
}

// Approve validates the stored draft and applies it to the candidate's
// profile atomically. The FOR UPDATE row lock serializes concurrent approves:
// the second caller sees status=approved and gets ErrNotReviewing (409).
func (i *ResumeInteractor) Approve(ctx context.Context, resumeID, adminID string) (*resume.Upload, error) {
	var approved *resume.Upload
	err := i.tx.WithinTransaction(ctx, func(ctx context.Context) error {
		up, err := i.repo.GetByIDForUpdate(ctx, resumeID)
		if err != nil {
			return err
		}
		if up.Status != resume.StatusReviewing {
			return resume.ErrNotReviewing
		}
		draft, err := resume.ParseDraft(up.Draft)
		if err != nil {
			// ドラフトは保存時に検証済みなので通常ここには来ない。来た場合は
			// 保存後にルールが変わった等なので、再保存を促す 409 相当で返す。
			return resume.ErrNotReviewing
		}
		if err := i.applyDraft(ctx, up.UserID, draft); err != nil {
			return err
		}
		var by *string
		if adminID != "" {
			by = &adminID
		}
		approved, err = i.repo.Approve(ctx, resumeID, by)
		if err != nil {
			return err
		}
		_, err = i.notificationRepo.Create(ctx, &notification.Notification{
			UserID:      &up.UserID,
			Type:        notification.TypeResumeApproved,
			Title:       "職務経歴書が承認されました",
			Body:        "職務経歴書の内容がプロフィールに反映されました",
			ReferenceID: &resumeID,
		})
		return err
	})
	if err != nil {
		return nil, err
	}
	return approved, nil
}

// applyDraft writes the draft into the profile: experiences/educations are
// full replacements, skills are additive (idempotent, capped at MaxPerUser),
// and profile text fields are overwritten only when present in the draft.
func (i *ResumeInteractor) applyDraft(ctx context.Context, userID string, draft *resume.Draft) error {
	if err := i.experienceRepo.DeleteByUserID(ctx, userID); err != nil {
		return err
	}
	for _, in := range draft.ExperienceInputs(userID) {
		entity := &experience.Experience{
			UserID:      in.UserID,
			CompanyName: in.CompanyName,
			Title:       in.Title,
			StartYear:   in.StartYear,
			StartMonth:  in.StartMonth,
			EndYear:     in.EndYear,
			EndMonth:    in.EndMonth,
			IsCurrent:   in.IsCurrent,
			Description: in.Description,
		}
		if _, err := i.experienceRepo.Create(ctx, entity); err != nil {
			return err
		}
	}
	if err := i.educationRepo.DeleteByUserID(ctx, userID); err != nil {
		return err
	}
	for _, in := range draft.EducationInputs(userID) {
		entity := &education.Education{
			UserID:    in.UserID,
			School:    in.School,
			Degree:    in.Degree,
			StartYear: in.StartYear,
			EndYear:   in.EndYear,
		}
		if _, err := i.educationRepo.Create(ctx, entity); err != nil {
			return err
		}
	}
	if err := i.attachSkills(ctx, userID, draft.SkillNames); err != nil {
		return err
	}
	var input user.UpdateProfileInput
	if draft.Headline != nil {
		input.Headline = &draft.Headline
	}
	if draft.About != nil {
		input.About = &draft.About
	}
	if draft.Location != nil {
		input.Location = &draft.Location
	}
	if draft.Industry != nil {
		input.Industry = &draft.Industry
	}
	if input.Headline == nil && input.About == nil && input.Location == nil && input.Industry == nil {
		return nil
	}
	_, err := i.userRepo.UpdateProfile(ctx, userID, input)
	return err
}

// attachSkills adds draft skills to the user, skipping names the user already
// has and stopping silently at the per-user cap (admin-reviewed input; a hard
// error would fail the whole approval over a soft limit).
func (i *ResumeInteractor) attachSkills(ctx context.Context, userID string, names []string) error {
	count, err := i.skillRepo.CountByUserID(ctx, userID)
	if err != nil {
		return err
	}
	for _, raw := range names {
		name, err := skill.ValidateName(raw)
		if err != nil {
			return err
		}
		has, err := i.skillRepo.UserHasSkillName(ctx, userID, name)
		if err != nil {
			return err
		}
		if has {
			continue
		}
		if count >= skill.MaxPerUser {
			return nil
		}
		s, err := i.skillRepo.UpsertSkill(ctx, name)
		if err != nil {
			return err
		}
		if err := i.skillRepo.AttachToUser(ctx, userID, s.ID); err != nil {
			return err
		}
		count++
	}
	return nil
}
