package company

// Profile is the full company profile read model (company-facing view).
// The public view is rendered from the same model minus contact fields.
type Profile struct {
	ID                   string
	CompanyName          string
	ContactPersonName    string
	PhoneNumber          string
	Email                string
	Headline             string
	Description          string
	Industry             string
	Location             string
	EmployeeCount        string
	FoundedYear          *int
	FoundedMonth         *int
	WebsiteURL           string
	LogoURL              string
	CoverImageURL        string
	RepresentativeName   string
	Capital              string
	Revenue              string
	Benefits             []string
	AverageAge           string
	AverageOvertimeHours string
	PaidLeaveRate        string
	SmokingPolicy        string
	GalleryURLs          []string
}

// UpdateProfileInput carries the editable profile fields.
type UpdateProfileInput struct {
	CompanyName          string
	ContactPersonName    string
	PhoneNumber          string
	Headline             string
	Description          string
	Industry             string
	Location             string
	EmployeeCount        string
	FoundedYear          *int
	FoundedMonth         *int
	WebsiteURL           string
	RepresentativeName   string
	Capital              string
	Revenue              string
	Benefits             []string
	AverageAge           string
	AverageOvertimeHours string
	PaidLeaveRate        string
	SmokingPolicy        string
}

// ImageKind identifies a single-slot profile image column.
type ImageKind string

const (
	ImageLogo  ImageKind = "logo"
	ImageCover ImageKind = "cover"
)
