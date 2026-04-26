package scout

import (
	"strings"
	"time"
)

const (
	MaxSubjectLength       = 200
	MaxBodyLength          = 5000
	MaxTemplateNameLen     = 100
	ReplyGraceDays         = 90
	MonthlyAllowance       = 30
	MaxStock               = 120
	QualityThreshold         = 0.13
	QualityMinSamples        = 50
	WarningImprovementDays   = 7
	WarningExtendedLookback  = 20
	DefaultLookbackDays      = 14
	MaxResendCount   int16 = 1
	MaxTemplatesPerCompany = 50
)

func ValidateSend(input SendScoutInput) error {
	subject := strings.TrimSpace(input.Subject)
	if subject == "" {
		return ErrSubjectRequired
	}
	if len([]rune(subject)) > MaxSubjectLength {
		return ErrSubjectTooLong
	}
	body := strings.TrimSpace(input.Body)
	if body == "" {
		return ErrBodyRequired
	}
	if len([]rune(body)) > MaxBodyLength {
		return ErrBodyTooLong
	}
	return nil
}

func ValidateTemplate(input CreateTemplateInput) error {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return ErrTemplateNameRequired
	}
	if len([]rune(name)) > MaxTemplateNameLen {
		return ErrTemplateNameTooLong
	}
	subject := strings.TrimSpace(input.Subject)
	if subject == "" {
		return ErrSubjectRequired
	}
	if len([]rune(subject)) > MaxSubjectLength {
		return ErrSubjectTooLong
	}
	body := strings.TrimSpace(input.Body)
	if body == "" {
		return ErrBodyRequired
	}
	if len([]rune(body)) > MaxBodyLength {
		return ErrBodyTooLong
	}
	return nil
}

func ValidateTemplateUpdate(input UpdateTemplateInput) error {
	return ValidateTemplate(CreateTemplateInput{
		CompanyID: "dummy",
		Name:      input.Name,
		Subject:   input.Subject,
		Body:      input.Body,
	})
}

func ValidateReply(body string) error {
	b := strings.TrimSpace(body)
	if b == "" {
		return ErrReplyBodyRequired
	}
	if len([]rune(b)) > MaxBodyLength {
		return ErrReplyBodyTooLong
	}
	return nil
}

func ValidateResponse(response string) (CandidateResponse, error) {
	switch CandidateResponse(response) {
	case ResponseInterested, ResponseDeclined:
		return CandidateResponse(response), nil
	default:
		return "", ErrInvalidResponse
	}
}

func CanResend(existing *ScoutMessage) error {
	if existing == nil {
		return nil
	}
	if existing.Status != StatusExpired && existing.Status != StatusDeclined {
		return ErrDuplicateScout
	}
	if existing.ResendCount >= MaxResendCount {
		return ErrResendLimitReached
	}
	return nil
}

func IsExpired(m *ScoutMessage) bool {
	if m.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*m.ExpiresAt)
}

type QualityInput struct {
	Sent14d           int
	Replied14d        int
	Sent20d           int
	Replied20d        int
	WarningStartedAt  *time.Time
	QualityRestricted bool
	Now               time.Time
}

type QualityResult struct {
	Score              QualityScore
	ShouldSetWarning   bool
	ShouldClearWarning bool
	ShouldRestrict     bool
}

func EvaluateQuality(input QualityInput) QualityResult {
	result := QualityResult{}
	result.Score = QualityScore{
		SentLast14d:    input.Sent14d,
		RepliedLast14d: input.Replied14d,
		Level:          QualityGood,
	}

	if input.QualityRestricted {
		result.Score.Level = QualityRestricted
		return result
	}

	if input.Sent14d < QualityMinSamples {
		if input.WarningStartedAt != nil {
			result.ShouldClearWarning = true
		}
		return result
	}

	rate := float64(input.Replied14d) / float64(input.Sent14d)
	result.Score.ReplyRate14d = rate

	if rate >= QualityThreshold {
		if input.WarningStartedAt != nil {
			result.ShouldClearWarning = true
		}
		return result
	}

	if input.WarningStartedAt == nil {
		result.ShouldSetWarning = true
		result.Score.Level = QualityWarning
		now := input.Now
		deadline := now.Add(WarningImprovementDays * 24 * time.Hour)
		result.Score.WarningStartedAt = &now
		result.Score.WarningDeadline = &deadline
		days := WarningImprovementDays
		result.Score.DaysRemaining = &days
		return result
	}

	deadline := input.WarningStartedAt.Add(WarningImprovementDays * 24 * time.Hour)
	result.Score.WarningStartedAt = input.WarningStartedAt
	result.Score.WarningDeadline = &deadline

	if input.Now.Before(deadline) {
		result.Score.Level = QualityWarning
		days := int(time.Until(deadline).Hours()/24) + 1
		result.Score.DaysRemaining = &days
		return result
	}

	// Improvement period expired — re-evaluate with 20-day window
	if input.Sent20d < QualityMinSamples {
		result.ShouldClearWarning = true
		return result
	}

	extRate := float64(input.Replied20d) / float64(input.Sent20d)
	result.Score.ReplyRate14d = extRate

	if extRate >= QualityThreshold {
		result.ShouldClearWarning = true
		result.Score.Level = QualityGood
		return result
	}

	result.ShouldRestrict = true
	result.Score.Level = QualityRestricted
	return result
}

func RenderTemplate(body string, vars map[string]string) string {
	result := body
	for key, value := range vars {
		result = strings.ReplaceAll(result, "{{"+key+"}}", value)
	}
	return result
}
