package workvalues

// SimilarUserExperience is a recent work history entry on a similar-user card.
type SimilarUserExperience struct {
	CompanyName string
	Title       string
	IsCurrent   bool
}

// SimilarUser is the read model for the "users with similar work values" list.
type SimilarUser struct {
	UserID       string
	Username     string
	Name         string
	Headline     *string
	AvatarURL    *string
	ProfileColor *string
	Similarity   float64
	TopNeeds     []string
	Experiences  []SimilarUserExperience
}

// UserWithMu is a public user candidate with their latest mu vector.
type UserWithMu struct {
	UserID       string
	Username     string
	Name         string
	Headline     *string
	AvatarURL    *string
	ProfileColor *string
	Mu           map[string]float64
}
