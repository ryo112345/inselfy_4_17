package controller

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/article"
	"github.com/akiyama/inselfy/backend/internal/domain/auth"
	"github.com/akiyama/inselfy/backend/internal/domain/company"
	"github.com/akiyama/inselfy/backend/internal/domain/education"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/experience"
	"github.com/akiyama/inselfy/backend/internal/domain/interview"
	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
	"github.com/akiyama/inselfy/backend/internal/domain/messaging"
	"github.com/akiyama/inselfy/backend/internal/domain/post"
	"github.com/akiyama/inselfy/backend/internal/domain/scout"
	"github.com/akiyama/inselfy/backend/internal/domain/skill"
	"github.com/akiyama/inselfy/backend/internal/domain/talentsearch"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

func handleError(ctx echo.Context, err error) error {
	switch {
	case errors.Is(err, domainerr.ErrNotFound),
		errors.Is(err, interview.ErrProposalNotFound),
		errors.Is(err, interview.ErrSlotNotFound),
		errors.Is(err, interview.ErrInterviewNotFound),
		errors.Is(err, interview.ErrApplicationNotFound),
		errors.Is(err, company.ErrTeamNotFound),
		errors.Is(err, company.ErrTeamMemberNotFound):
		return ctx.JSON(http.StatusNotFound, openapi.ModelsNotFoundError{
			Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
			Message: err.Error(),
		})
	case errors.Is(err, domainerr.ErrConflict),
		errors.Is(err, experience.ErrTooManyEntries),
		errors.Is(err, education.ErrTooManyEntries),
		errors.Is(err, skill.ErrTooManyEntries),
		errors.Is(err, scout.ErrDuplicateScout),
		errors.Is(err, scout.ErrTooManyTemplates),
		errors.Is(err, messaging.ErrConversationExists),
		errors.Is(err, jobapplication.ErrAlreadyApplied):
		return ctx.JSON(http.StatusConflict, openapi.ModelsConflictError{
			Code:    openapi.ModelsConflictErrorCodeCONFLICT,
			Message: err.Error(),
		})
	case errors.Is(err, port.ErrForbidden),
		errors.Is(err, company.ErrNotTeamOwner),
		errors.Is(err, scout.ErrScoutingDisabled),
		errors.Is(err, scout.ErrQualityRestricted),
		errors.Is(err, scout.ErrNotOwner),
		errors.Is(err, interview.ErrNotProposalOwner):
		return ctx.JSON(http.StatusForbidden, openapi.ModelsForbiddenError{
			Code:    openapi.ModelsForbiddenErrorCodeFORBIDDEN,
			Message: err.Error(),
		})
	case isBadRequest(err):
		return ctx.JSON(http.StatusBadRequest, openapi.ModelsBadRequestError{
			Code:    openapi.ModelsBadRequestErrorCodeBADREQUEST,
			Message: err.Error(),
		})
	default:
		return ctx.JSON(http.StatusInternalServerError, openapi.ModelsErrorResponse{
			Code:    "INTERNAL",
			Message: err.Error(),
		})
	}
}

func isBadRequest(err error) bool {
	switch {
	case errors.Is(err, domainerr.ErrBadRequest):
		return true
	case errors.Is(err, user.ErrInvalidUsername),
		errors.Is(err, user.ErrNameRequired),
		errors.Is(err, user.ErrNameTooLong),
		errors.Is(err, user.ErrHeadlineTooLong),
		errors.Is(err, user.ErrLocationTooLong),
		errors.Is(err, user.ErrAboutTooLong),
		errors.Is(err, user.ErrIndustryTooLong),
		errors.Is(err, user.ErrJobTypeTooLong),
		errors.Is(err, user.ErrJobSeekingStatusTooLong),
		errors.Is(err, user.ErrInvalidProfileColor):
		return true
	case errors.Is(err, experience.ErrCompanyNameRequired),
		errors.Is(err, experience.ErrCompanyNameTooLong),
		errors.Is(err, experience.ErrTitleRequired),
		errors.Is(err, experience.ErrTitleTooLong),
		errors.Is(err, experience.ErrDescriptionTooLong),
		errors.Is(err, experience.ErrStartYearOutOfRange),
		errors.Is(err, experience.ErrStartMonthOutOfRange),
		errors.Is(err, experience.ErrEndYearOutOfRange),
		errors.Is(err, experience.ErrEndMonthOutOfRange),
		errors.Is(err, experience.ErrCurrentHasEnd),
		errors.Is(err, experience.ErrEndedMissingEnd),
		errors.Is(err, experience.ErrEndBeforeStart):
		return true
	case errors.Is(err, education.ErrSchoolRequired),
		errors.Is(err, education.ErrSchoolTooLong),
		errors.Is(err, education.ErrDegreeTooLong),
		errors.Is(err, education.ErrYearOutOfRange),
		errors.Is(err, education.ErrEndBeforeStart):
		return true
	case errors.Is(err, skill.ErrNameRequired),
		errors.Is(err, skill.ErrNameTooLong):
		return true
	case errors.Is(err, post.ErrContentRequired),
		errors.Is(err, post.ErrContentTooLong),
		errors.Is(err, post.ErrCommentContentRequired),
		errors.Is(err, post.ErrCommentContentTooLong):
		return true
	case errors.Is(err, article.ErrTitleRequired),
		errors.Is(err, article.ErrTitleTooLong),
		errors.Is(err, article.ErrBodyTooLong),
		errors.Is(err, article.ErrInvalidPrice),
		errors.Is(err, article.ErrPaidRequiresPrice),
		errors.Is(err, article.ErrFreeNoPrice),
		errors.Is(err, article.ErrNotAuthor),
		errors.Is(err, article.ErrAlreadyPurchased),
		errors.Is(err, article.ErrCannotBuyOwn),
		errors.Is(err, article.ErrNotPublished),
		errors.Is(err, article.ErrNotPaid),
		errors.Is(err, article.ErrTooManyTags),
		errors.Is(err, article.ErrTagTooLong):
		return true
	case errors.Is(err, jobapplication.ErrInvalidStatus),
		errors.Is(err, jobapplication.ErrJobNotOpen):
		return true
	case errors.Is(err, company.ErrTeamNameRequired),
		errors.Is(err, company.ErrTeamMemberLimit):
		return true
	case errors.Is(err, messaging.ErrBodyRequired),
		errors.Is(err, messaging.ErrBodyTooLong),
		errors.Is(err, messaging.ErrSelfConversation),
		errors.Is(err, messaging.ErrNotParticipant):
		return true
	case errors.Is(err, interview.ErrProposalNotPending),
		errors.Is(err, interview.ErrProposalExpired),
		errors.Is(err, interview.ErrSlotNotInProposal),
		errors.Is(err, interview.ErrTimeOutsideSlot),
		errors.Is(err, interview.ErrInterviewNotScheduled),
		errors.Is(err, interview.ErrNoSlots),
		errors.Is(err, interview.ErrTooManySlots),
		errors.Is(err, interview.ErrInvalidTimeRange):
		return true
	case errors.Is(err, talentsearch.ErrTeamWVUnavailable),
		errors.Is(err, talentsearch.ErrTeamCIUnavailable),
		errors.Is(err, talentsearch.ErrTeamDiagUnavailable),
		errors.Is(err, talentsearch.ErrTeamWVMissing),
		errors.Is(err, talentsearch.ErrTeamCIMissing),
		errors.Is(err, talentsearch.ErrWVWeightsRequired),
		errors.Is(err, talentsearch.ErrCIWeightsRequired),
		errors.Is(err, talentsearch.ErrBothWeightsRequired):
		return true
	case errors.Is(err, scout.ErrSubjectRequired),
		errors.Is(err, scout.ErrSubjectTooLong),
		errors.Is(err, scout.ErrBodyRequired),
		errors.Is(err, scout.ErrBodyTooLong),
		errors.Is(err, scout.ErrTemplateNameRequired),
		errors.Is(err, scout.ErrTemplateNameTooLong),
		errors.Is(err, scout.ErrReplyBodyRequired),
		errors.Is(err, scout.ErrReplyBodyTooLong),
		errors.Is(err, scout.ErrInvalidResponse),
		errors.Is(err, scout.ErrInsufficientCredits),
		errors.Is(err, scout.ErrAlreadyResponded),
		errors.Is(err, scout.ErrScoutExpired),
		errors.Is(err, scout.ErrNotSentOrOpened),
		errors.Is(err, scout.ErrResendLimitReached):
		return true
	}
	return false
}

func badRequest(ctx echo.Context, message string) error {
	return ctx.JSON(http.StatusBadRequest, openapi.ModelsBadRequestError{
		Code:    openapi.ModelsBadRequestErrorCodeBADREQUEST,
		Message: message,
	})
}

// errorResponse renders the canonical {code, message} error body used across the
// API. The helpers below wrap it per status so handlers never hand-roll error maps.
func errorResponse(ctx echo.Context, status int, code, message string) error {
	return ctx.JSON(status, openapi.ModelsErrorResponse{Code: code, Message: message})
}

func unauthorized(ctx echo.Context, message string) error {
	return errorResponse(ctx, http.StatusUnauthorized, "UNAUTHORIZED", message)
}

func notFoundError(ctx echo.Context, message string) error {
	return errorResponse(ctx, http.StatusNotFound, "NOT_FOUND", message)
}

func internalError(ctx echo.Context, message string) error {
	return errorResponse(ctx, http.StatusInternalServerError, "INTERNAL", message)
}

func handleAuthError(ctx echo.Context, err error) error {
	if err == nil ||
		errors.Is(err, auth.ErrInvalidGoogleToken) ||
		errors.Is(err, auth.ErrUnauthorized) ||
		errors.Is(err, auth.ErrTokenExpired) ||
		errors.Is(err, auth.ErrRefreshTokenRevoked) {
		return unauthorized(ctx, "unauthorized")
	}
	return handleError(ctx, err)
}

func invalidField(name string) error {
	return fmt.Errorf("%w: invalid field %q", domainerr.ErrBadRequest, name)
}
