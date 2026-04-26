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
	QualityThreshold       = 0.13
	QualityMinSamples      = 10
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

func CalculateQualityScore(sent, replied int) QualityScore {
	qs := QualityScore{
		SentLast14d:    sent,
		RepliedLast14d: replied,
		Level:          QualityGood,
	}
	if sent < QualityMinSamples {
		return qs
	}
	qs.ReplyRate14d = float64(replied) / float64(sent)
	if qs.ReplyRate14d < QualityThreshold {
		qs.Level = QualityWarning
	}
	return qs
}

func RenderTemplate(body string, vars map[string]string) string {
	result := body
	for key, value := range vars {
		result = strings.ReplaceAll(result, "{{"+key+"}}", value)
	}
	return result
}
