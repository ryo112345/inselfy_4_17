package controller

import (
	"context"
	"errors"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type SimilarUsersController struct {
	input port.SimilarUsersInputPort
}

func NewSimilarUsersController(input port.SimilarUsersInputPort) *SimilarUsersController {
	return &SimilarUsersController{input: input}
}

func (c *SimilarUsersController) GetSimilarUsers(ctx context.Context, req openapi.SimilarUsersGetSimilarUsersRequestObject) (openapi.SimilarUsersGetSimilarUsersResponseObject, error) {
	limit := 0
	if req.Params.Limit != nil {
		limit = int(*req.Params.Limit)
	}
	if limit < 1 || limit > 50 {
		limit = 10
	}

	users, err := c.input.GetSimilarUsers(ctx, req.UserId, limit)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return openapi.SimilarUsersGetSimilarUsers404JSONResponse{
				Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
				Message: "user has no work values result",
			}, nil
		}
		return nil, err
	}

	return openapi.SimilarUsersGetSimilarUsers200JSONResponse(presenter.SimilarUsersResponse(users)), nil
}
