package talentsearch

// Filter narrows candidate searches. The zero value matches all public users.
type Filter struct {
	Keyword          string
	Skills           []string
	Location         string
	Industry         string
	JobSeekingStatus string
	JobType          string
	DiagnosedOnly    bool
}

func (f Filter) IsEmpty() bool {
	return f.Keyword == "" && len(f.Skills) == 0 && f.Location == "" && f.Industry == "" &&
		f.JobSeekingStatus == "" && f.JobType == "" && !f.DiagnosedOnly
}
