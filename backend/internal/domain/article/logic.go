package article

import (
	"errors"
	"regexp"
	"strings"
)

const (
	MaxTitleLength  = 200
	MaxBodyLength   = 100000
	MaxPriceYen     = 1000000
	MaxTags         = 10
	MaxTagLength    = 50
	PaidSeparator   = `<div data-paid-separator="true"></div>`
)

var (
	ErrTitleRequired     = errors.New("title is required")
	ErrTitleTooLong      = errors.New("title must be 200 characters or fewer")
	ErrBodyTooLong       = errors.New("body must be 100000 characters or fewer")
	ErrInvalidPrice      = errors.New("price must be between 0 and 1000000")
	ErrPaidRequiresPrice = errors.New("paid articles must have a price greater than 0")
	ErrFreeNoPrice       = errors.New("free articles must have price 0")
	ErrNotAuthor         = errors.New("not the author of this article")
	ErrAlreadyPurchased  = errors.New("article already purchased")
	ErrCannotBuyOwn      = errors.New("cannot purchase own article")
	ErrNotPublished      = errors.New("article is not published")
	ErrNotPaid           = errors.New("article is not a paid article")
	ErrTooManyTags       = errors.New("too many tags (max 10)")
	ErrTagTooLong        = errors.New("tag must be 50 characters or fewer")
)

func ValidateCreate(input CreateArticleInput) error {
	if err := validateCommon(input.Title, input.Body, input.IsPaid, input.PriceYen, input.Tags); err != nil {
		return err
	}
	return nil
}

func ValidateUpdate(input UpdateArticleInput) error {
	if err := validateCommon(input.Title, input.Body, input.IsPaid, input.PriceYen, input.Tags); err != nil {
		return err
	}
	return nil
}

func validateCommon(title, body string, isPaid bool, priceYen int, tags []string) error {
	t := strings.TrimSpace(title)
	if len(t) == 0 {
		return ErrTitleRequired
	}
	if len([]rune(t)) > MaxTitleLength {
		return ErrTitleTooLong
	}
	if len([]rune(body)) > MaxBodyLength {
		return ErrBodyTooLong
	}
	if priceYen < 0 || priceYen > MaxPriceYen {
		return ErrInvalidPrice
	}
	if isPaid && priceYen <= 0 {
		return ErrPaidRequiresPrice
	}
	if !isPaid && priceYen != 0 {
		return ErrFreeNoPrice
	}
	if len(tags) > MaxTags {
		return ErrTooManyTags
	}
	for _, tag := range tags {
		if len([]rune(tag)) > MaxTagLength {
			return ErrTagTooLong
		}
	}
	return nil
}

var htmlTagRe = regexp.MustCompile(`<[^>]*>`)
var imgTagRe = regexp.MustCompile(`<img[\s>]`)

func CountChars(body string) int {
	text := htmlTagRe.ReplaceAllString(body, "")
	return len([]rune(strings.TrimSpace(text)))
}

func CountImages(body string) int {
	return len(imgTagRe.FindAllString(body, -1))
}

// SplitBody splits article body on the first "---paid---" separator.
// Returns (freePreview, paidContent). If no separator, entire body is free.
func SplitBody(body string) (string, string) {
	idx := strings.Index(body, PaidSeparator)
	if idx < 0 {
		return body, ""
	}
	free := body[:idx]
	paid := body[idx+len(PaidSeparator):]
	return strings.TrimRight(free, "\n"), strings.TrimLeft(paid, "\n")
}
