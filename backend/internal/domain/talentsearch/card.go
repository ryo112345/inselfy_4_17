// Package talentsearch defines read models for company-facing candidate cards.
package talentsearch

// Experience is a candidate's recent work history shown on a card.
type Experience struct {
	CompanyName string
	Title       string
}

// Card is the composite read model behind talent search results and
// saved-candidate lists. Similarity fields are nil unless the listing
// computed them.
type Card struct {
	UserID           string
	Username         string
	Name             string
	Headline         *string
	AvatarURL        *string
	ProfileColor     *string
	JobSeekingStatus *string
	Skills           []string
	Experiences      []Experience
	TopWVLabels      []string
	TopCILabels      []string
	Similarity       *float64
	WVSimilarity     *float64
	CISimilarity     *float64
	IntSimilarity    *float64
}
