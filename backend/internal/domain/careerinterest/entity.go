package careerinterest

import "time"

type Session struct {
	ID          string
	UserID      string
	Status      string
	Items       []Item
	CreatedAt   time.Time
	CompletedAt *time.Time
}

type Item struct {
	QuestionNumber  int    `json:"question_number"`
	ItemCode        string `json:"item_code"`
	BasicInterestID string `json:"basic_interest_id"`
	SkillLevel      string `json:"skill_level"`
	ActivityType    string `json:"activity_type"`
	TextJa          string `json:"text_ja"`
}

type Response struct {
	QuestionNumber int    `json:"question_number"`
	ItemCode       string `json:"item_code"`
	Score          int    `json:"score"`
}

type Result struct {
	ID                   string
	SessionID            string
	UserID               string
	Responses            []Response
	QuestionCount        int
	DifferentiationSD    *float64
	DifferentiationLevel *string
	BasicScores          []BasicScore
	TypeScores           []TypeScore
	HasReport            bool
	ReportRequested      bool
	CreatedAt            time.Time
}

const (
	StatusInProgress = "in_progress"
	StatusCompleted  = "completed"
	StatusExpired    = "expired"
)
