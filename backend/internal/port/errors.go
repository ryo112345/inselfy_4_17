package port

import "errors"

// ErrForbidden indicates the caller targeted a resource owned by a different user.
// The HTTP layer maps this to 403 Forbidden.
var ErrForbidden = errors.New("forbidden")
