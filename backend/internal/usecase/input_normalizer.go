package usecase

import "strings"

// normalizeStrings trims leading/trailing whitespace on each non-nil field
// in place. Interactors call this on request-input strings before domain
// validation. Normalization beyond TrimSpace (lowercasing, defaults,
// empty-to-nil) stays with each caller.
func normalizeStrings(fields ...*string) {
	for _, f := range fields {
		if f != nil {
			*f = strings.TrimSpace(*f)
		}
	}
}
