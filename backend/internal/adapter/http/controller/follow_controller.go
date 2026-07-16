package controller

import (
	"context"
	"net/http"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type FollowController struct {
	input port.FollowInputPort
}

func NewFollowController(
	input port.FollowInputPort,
) *FollowController {
	return &FollowController{input: input}
}

func (c *FollowController) Follow(ctx context.Context, req openapi.FollowsFollowUserRequestObject) (openapi.FollowsFollowUserResponseObject, error) {
	if err := c.input.Follow(ctx, authmw.UserIDFromContext(ctx), req.Username); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.FollowsFollowUser404JSONResponse(notFoundBody(err)), nil
		case http.StatusConflict:
			return openapi.FollowsFollowUser409JSONResponse(conflictBody(err)), nil
		case http.StatusBadRequest:
			return openapi.FollowsFollowUser400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.FollowsFollowUser204Response{}, nil
}

func (c *FollowController) Unfollow(ctx context.Context, req openapi.FollowsUnfollowUserRequestObject) (openapi.FollowsUnfollowUserResponseObject, error) {
	if err := c.input.Unfollow(ctx, authmw.UserIDFromContext(ctx), req.Username); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.FollowsUnfollowUser404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.FollowsUnfollowUser400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.FollowsUnfollowUser204Response{}, nil
}

func (c *FollowController) GetFollowers(ctx context.Context, req openapi.FollowsListFollowersRequestObject) (openapi.FollowsListFollowersResponseObject, error) {
	users, total, err := c.input.GetFollowers(ctx, req.Username, derefInt32(req.Params.Limit), derefInt32(req.Params.Offset))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.FollowsListFollowers404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.FollowsListFollowers400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.FollowsListFollowers200JSONResponse(presenter.FollowUsersResponse(users, total)), nil
}

func (c *FollowController) GetFollowing(ctx context.Context, req openapi.FollowsListFollowingRequestObject) (openapi.FollowsListFollowingResponseObject, error) {
	users, total, err := c.input.GetFollowing(ctx, req.Username, derefInt32(req.Params.Limit), derefInt32(req.Params.Offset))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.FollowsListFollowing404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.FollowsListFollowing400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.FollowsListFollowing200JSONResponse(presenter.FollowUsersResponse(users, total)), nil
}

func (c *FollowController) GetFollowStatus(ctx context.Context, req openapi.FollowsGetFollowStatusRequestObject) (openapi.FollowsGetFollowStatusResponseObject, error) {
	status, err := c.input.GetFollowStatus(ctx, authmw.UserIDFromContext(ctx), req.Username)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.FollowsGetFollowStatus404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.FollowsGetFollowStatus400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.FollowsGetFollowStatus200JSONResponse(presenter.FollowStatusResponse(status)), nil
}

// derefInt32 unwraps an optional query parameter, defaulting to 0 (the same
// value the previous strconv.Atoi-based parsing produced for absent params).
func derefInt32(v *int32) int {
	if v == nil {
		return 0
	}
	return int(*v)
}
