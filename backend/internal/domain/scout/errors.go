package scout

import "errors"

var (
	ErrInsufficientCredits  = errors.New("insufficient scout credits")
	ErrDuplicateScout       = errors.New("scout already sent to this candidate")
	ErrScoutingDisabled     = errors.New("candidate is not accepting scouts")
	ErrAlreadyResponded     = errors.New("already responded to this scout")
	ErrScoutExpired         = errors.New("scout has expired")
	ErrNotSentOrOpened      = errors.New("scout is not in sent or opened status")
	ErrResendLimitReached   = errors.New("resend limit reached for this candidate")
	ErrQualityRestricted    = errors.New("sending restricted due to low quality score")
	ErrSubjectRequired      = errors.New("subject is required")
	ErrSubjectTooLong       = errors.New("subject must be 200 characters or fewer")
	ErrBodyRequired         = errors.New("body is required")
	ErrBodyTooLong          = errors.New("body must be 5000 characters or fewer")
	ErrTemplateNameRequired = errors.New("template name is required")
	ErrTemplateNameTooLong  = errors.New("template name must be 100 characters or fewer")
	ErrTooManyTemplates     = errors.New("maximum 50 templates per company")
	ErrNotOwner             = errors.New("not the owner of this resource")
	ErrReplyBodyRequired    = errors.New("reply body is required")
	ErrReplyBodyTooLong     = errors.New("reply body must be 5000 characters or fewer")
	ErrInvalidResponse      = errors.New("response must be 'interested' or 'declined'")
)
