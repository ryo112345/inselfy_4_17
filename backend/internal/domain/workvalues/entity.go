package workvalues

import "time"

type Session struct {
	ID           string
	UserID       string
	Status       string
	InitialPairs []Pair
	CreatedAt    time.Time
	CompletedAt  *time.Time
}

type Pair struct {
	NeedA string `json:"need_a"`
	NeedB string `json:"need_b"`
}

type Response struct {
	NeedA          string `json:"need_a"`
	NeedB          string `json:"need_b"`
	Winner         string `json:"winner"`
	QuestionNumber int    `json:"question_number"`
}

type Result struct {
	ID                     string
	SessionID              string
	UserID                 string
	Responses              []Response
	Mu                     map[string]float64
	SE                     map[string]float64
	ConsistencyCoefficient *float64
	ConsistencyLevel       *string
	QuestionCount          int
	CreatedAt              time.Time
}

const (
	StatusInProgress = "in_progress"
	StatusCompleted  = "completed"
	StatusExpired    = "expired"
)
