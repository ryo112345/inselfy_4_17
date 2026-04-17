// Package http wires HTTP-layer factories (presenters).
package http

import "github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"

// NewUserOutputFactory returns a factory function that creates UserPresenter instances.
func NewUserOutputFactory() func() *presenter.UserPresenter {
	return func() *presenter.UserPresenter {
		return presenter.NewUserPresenter()
	}
}
