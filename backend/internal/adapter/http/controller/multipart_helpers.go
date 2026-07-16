package controller

import (
	"errors"
	"io"
	"mime/multipart"
)

// Sentinel errors so callers can map upload failures onto their operation's
// typed 400 response with the historical messages.
var (
	errFilePartMissing  = errors.New("multipart: file part missing")
	errFilePartTooLarge = errors.New("multipart: file part too large")
)

// readFilePart pulls the named file part out of a strict-server multipart
// body (*multipart.Reader), enforcing a size cap
// (docs/strict-server-migration.md 3-3 パターン集).
func readFilePart(r *multipart.Reader, field string, maxBytes int64) (data []byte, filename, contentType string, err error) {
	for {
		part, err := r.NextPart()
		if err != nil {
			// io.EOF: the field never appeared. Other errors (malformed
			// multipart) are indistinguishable from a missing file for
			// callers, so both map to the "file is required" 400.
			return nil, "", "", errFilePartMissing
		}
		if part.FormName() != field {
			_ = part.Close()
			continue
		}
		data, err = io.ReadAll(io.LimitReader(part, maxBytes+1))
		filename = part.FileName()
		contentType = part.Header.Get("Content-Type")
		_ = part.Close()
		if err != nil {
			return nil, "", "", err
		}
		if int64(len(data)) > maxBytes {
			return nil, "", "", errFilePartTooLarge
		}
		return data, filename, contentType, nil
	}
}
