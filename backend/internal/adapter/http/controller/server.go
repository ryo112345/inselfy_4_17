package controller

import (
	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
)

// Server implements the generated ServerInterface by delegating to domain controllers.
type Server struct {
	user          *UserController
	experience    *ExperienceController
	education     *EducationController
	skill         *SkillController
	scoutSettings *ScoutSettingsController
	similarUsers  *SimilarUsersController
	teamDiagnose  *TeamDiagnoseController
	scoutTemplate *ScoutTemplateController
	notification  *NotificationController
	follow        *FollowController
	auth          *AuthController
	companyAuth   *CompanyAuthController
	ci            *CareerInterestController
	wv            *WorkValuesController
	post          *PostController
	scout         *ScoutController
	candScout     *CandidateScoutController
	jobApp        *JobApplicationController
}

var _ openapi.ServerInterface = (*Server)(nil)

// NewServer wires controllers into the generated ServerInterface.
func NewServer(
	user *UserController,
	experience *ExperienceController,
	education *EducationController,
	skill *SkillController,
	scoutSettings *ScoutSettingsController,
	similarUsers *SimilarUsersController,
	teamDiagnose *TeamDiagnoseController,
	scoutTemplate *ScoutTemplateController,
	notification *NotificationController,
	follow *FollowController,
	auth *AuthController,
	companyAuth *CompanyAuthController,
	ci *CareerInterestController,
	wv *WorkValuesController,
	post *PostController,
	scout *ScoutController,
	candScout *CandidateScoutController,
	jobApp *JobApplicationController,
) *Server {
	return &Server{
		user:          user,
		experience:    experience,
		education:     education,
		skill:         skill,
		scoutSettings: scoutSettings,
		similarUsers:  similarUsers,
		teamDiagnose:  teamDiagnose,
		scoutTemplate: scoutTemplate,
		notification:  notification,
		follow:        follow,
		auth:          auth,
		companyAuth:   companyAuth,
		ci:            ci,
		wv:            wv,
		post:          post,
		scout:         scout,
		candScout:     candScout,
		jobApp:        jobApp,
	}
}

// --- Users ---

func (s *Server) UsersCreateUser(ctx echo.Context) error { return s.user.Create(ctx) }

func (s *Server) UsersGetUserByUsername(ctx echo.Context, username string) error {
	return s.user.GetByUsername(ctx, username)
}

func (s *Server) UsersUpdateUserProfile(ctx echo.Context, username string) error {
	return s.user.UpdateProfile(ctx, username)
}

// --- Experiences ---

func (s *Server) ExperiencesListExperiences(ctx echo.Context, username string) error {
	return s.experience.List(ctx, username)
}

func (s *Server) ExperiencesCreateExperience(ctx echo.Context, username string) error {
	return s.experience.Create(ctx, username)
}

func (s *Server) ExperiencesUpdateExperience(ctx echo.Context, username, experienceID string) error {
	return s.experience.Update(ctx, username, experienceID)
}

func (s *Server) ExperiencesDeleteExperience(ctx echo.Context, username, experienceID string) error {
	return s.experience.Delete(ctx, username, experienceID)
}

// --- Educations ---

func (s *Server) EducationsListEducations(ctx echo.Context, username string) error {
	return s.education.List(ctx, username)
}

func (s *Server) EducationsCreateEducation(ctx echo.Context, username string) error {
	return s.education.Create(ctx, username)
}

func (s *Server) EducationsUpdateEducation(ctx echo.Context, username, educationID string) error {
	return s.education.Update(ctx, username, educationID)
}

func (s *Server) EducationsDeleteEducation(ctx echo.Context, username, educationID string) error {
	return s.education.Delete(ctx, username, educationID)
}

// --- Skills ---

func (s *Server) SkillsListSkills(ctx echo.Context, username string) error {
	return s.skill.List(ctx, username)
}

func (s *Server) SkillsAttachSkill(ctx echo.Context, username string) error {
	return s.skill.Attach(ctx, username)
}

func (s *Server) SkillsDetachSkill(ctx echo.Context, username, name string) error {
	return s.skill.Detach(ctx, username, name)
}

// --- ScoutSettings ---

func (s *Server) ScoutSettingsGetScoutSettings(ctx echo.Context) error {
	return s.scoutSettings.Get(ctx)
}

func (s *Server) ScoutSettingsUpdateScoutSettings(ctx echo.Context) error {
	return s.scoutSettings.Update(ctx)
}

// --- SimilarUsers ---

func (s *Server) SimilarUsersGetSimilarUsers(ctx echo.Context, userID string, _ openapi.SimilarUsersGetSimilarUsersParams) error {
	return s.similarUsers.GetSimilarUsers(ctx, userID)
}

// --- TeamDiagnose ---

func (s *Server) TeamDiagnoseGetDiagnoseByToken(ctx echo.Context, token string) error {
	return s.teamDiagnose.GetByToken(ctx, token)
}

func (s *Server) TeamDiagnoseUpdateDiagnoseStatus(ctx echo.Context, token string) error {
	return s.teamDiagnose.UpdateStatus(ctx, token)
}

// --- ScoutTemplates ---

func (s *Server) ScoutTemplatesCreateScoutTemplate(ctx echo.Context) error {
	return s.scoutTemplate.Create(ctx)
}

func (s *Server) ScoutTemplatesListScoutTemplates(ctx echo.Context) error {
	return s.scoutTemplate.List(ctx)
}

func (s *Server) ScoutTemplatesGetScoutTemplate(ctx echo.Context, templateID string) error {
	return s.scoutTemplate.Get(ctx, templateID)
}

func (s *Server) ScoutTemplatesUpdateScoutTemplate(ctx echo.Context, templateID string) error {
	return s.scoutTemplate.Update(ctx, templateID)
}

func (s *Server) ScoutTemplatesDeleteScoutTemplate(ctx echo.Context, templateID string) error {
	return s.scoutTemplate.Delete(ctx, templateID)
}

// --- Notifications ---

func (s *Server) UserNotificationsListUserNotifications(ctx echo.Context, _ openapi.UserNotificationsListUserNotificationsParams) error {
	return s.notification.ListByUser(ctx)
}

func (s *Server) UserNotificationsCountUserUnreadNotifications(ctx echo.Context) error {
	return s.notification.CountUnreadByUser(ctx)
}

func (s *Server) UserNotificationsMarkUserNotificationRead(ctx echo.Context, id string) error {
	return s.notification.MarkAsRead(ctx, id)
}

func (s *Server) UserNotificationsMarkAllUserNotificationsRead(ctx echo.Context) error {
	return s.notification.MarkAllAsReadByUser(ctx)
}

func (s *Server) CompanyNotificationsListCompanyNotifications(ctx echo.Context, _ openapi.CompanyNotificationsListCompanyNotificationsParams) error {
	return s.notification.ListByCompany(ctx)
}

func (s *Server) CompanyNotificationsCountCompanyUnreadNotifications(ctx echo.Context) error {
	return s.notification.CountUnreadByCompany(ctx)
}

func (s *Server) CompanyNotificationsMarkCompanyNotificationRead(ctx echo.Context, id string) error {
	return s.notification.MarkAsRead(ctx, id)
}

func (s *Server) CompanyNotificationsMarkAllCompanyNotificationsRead(ctx echo.Context) error {
	return s.notification.MarkAllAsReadByCompany(ctx)
}

// --- Follows ---

func (s *Server) FollowsFollowUser(ctx echo.Context, username string) error {
	return s.follow.Follow(ctx, username)
}

func (s *Server) FollowsUnfollowUser(ctx echo.Context, username string) error {
	return s.follow.Unfollow(ctx, username)
}

func (s *Server) FollowsListFollowers(ctx echo.Context, username string, _ openapi.FollowsListFollowersParams) error {
	return s.follow.GetFollowers(ctx, username)
}

func (s *Server) FollowsListFollowing(ctx echo.Context, username string, _ openapi.FollowsListFollowingParams) error {
	return s.follow.GetFollowing(ctx, username)
}

func (s *Server) FollowsGetFollowStatus(ctx echo.Context, username string) error {
	return s.follow.GetFollowStatus(ctx, username)
}

// --- Auth ---

func (s *Server) AuthGoogleLogin(ctx echo.Context) error { return s.auth.GoogleLogin(ctx) }

func (s *Server) AuthRefreshToken(ctx echo.Context) error { return s.auth.Refresh(ctx) }

func (s *Server) AuthLogout(ctx echo.Context) error { return s.auth.Logout(ctx) }

func (s *Server) AuthGetMe(ctx echo.Context) error { return s.auth.GetMe(ctx) }

// --- CompanyAuth ---

func (s *Server) CompanyAuthCompanyRegister(ctx echo.Context) error {
	return s.companyAuth.Register(ctx)
}

func (s *Server) CompanyAuthCompanyLogin(ctx echo.Context) error {
	return s.companyAuth.Login(ctx)
}

func (s *Server) CompanyAuthCompanyRefreshToken(ctx echo.Context) error {
	return s.companyAuth.Refresh(ctx)
}

func (s *Server) CompanyAuthCompanyLogout(ctx echo.Context) error {
	return s.companyAuth.Logout(ctx)
}

func (s *Server) CompanyAuthCompanyGetMe(ctx echo.Context) error {
	return s.companyAuth.GetMe(ctx)
}

// --- CareerInterest ---

func (s *Server) CareerInterestCiStartSession(ctx echo.Context) error {
	return s.ci.StartSession(ctx)
}

func (s *Server) CareerInterestCiSubmitResult(ctx echo.Context, sessionID string) error {
	return s.ci.SubmitResult(ctx, sessionID)
}

func (s *Server) CareerInterestCiGetLatestResult(ctx echo.Context, userID string) error {
	return s.ci.GetLatestResult(ctx, userID)
}

func (s *Server) CareerInterestCiGetResultBySession(ctx echo.Context, sessionID string) error {
	return s.ci.GetResultBySessionID(ctx, sessionID)
}

// --- WorkValues ---

func (s *Server) WorkValuesWvStartSession(ctx echo.Context) error {
	return s.wv.StartSession(ctx)
}

func (s *Server) WorkValuesWvSubmitResult(ctx echo.Context, sessionID string) error {
	return s.wv.SubmitResult(ctx, sessionID)
}

func (s *Server) WorkValuesWvGetLatestResult(ctx echo.Context, userID string) error {
	return s.wv.GetLatestResult(ctx, userID)
}

func (s *Server) WorkValuesWvGetResultBySession(ctx echo.Context, sessionID string) error {
	return s.wv.GetResultBySessionID(ctx, sessionID)
}

// --- Posts ---

func (s *Server) PostsCreatePost(ctx echo.Context) error { return s.post.Create(ctx) }

func (s *Server) PostsListTimelinePosts(ctx echo.Context, _ openapi.PostsListTimelinePostsParams) error {
	return s.post.ListTimeline(ctx)
}

func (s *Server) PostsListPostsByUser(ctx echo.Context, userID string, _ openapi.PostsListPostsByUserParams) error {
	return s.post.ListByUserID(ctx, userID)
}

func (s *Server) PostsListLikedPostsByUser(ctx echo.Context, userID string, _ openapi.PostsListLikedPostsByUserParams) error {
	return s.post.ListLikedByUserID(ctx, userID)
}

func (s *Server) PostsGetPost(ctx echo.Context, postID string, _ openapi.PostsGetPostParams) error {
	return s.post.GetByID(ctx, postID)
}

func (s *Server) PostsDeletePost(ctx echo.Context, postID string) error {
	return s.post.Delete(ctx, postID)
}

func (s *Server) PostsTogglePostLike(ctx echo.Context, postID string) error {
	return s.post.ToggleLike(ctx, postID)
}

func (s *Server) PostsTogglePostRepost(ctx echo.Context, postID string) error {
	return s.post.ToggleRepost(ctx, postID)
}

func (s *Server) PostsListPostComments(ctx echo.Context, postID string, _ openapi.PostsListPostCommentsParams) error {
	return s.post.ListComments(ctx, postID)
}

func (s *Server) PostsCreatePostComment(ctx echo.Context, postID string) error {
	return s.post.CreateComment(ctx, postID)
}

func (s *Server) PostsDeletePostComment(ctx echo.Context, commentID string) error {
	return s.post.DeleteComment(ctx, commentID)
}

// --- CompanyScouts ---

func (s *Server) CompanyScoutsSendScout(ctx echo.Context) error { return s.scout.Send(ctx) }

func (s *Server) CompanyScoutsListCompanyScouts(ctx echo.Context, _ openapi.CompanyScoutsListCompanyScoutsParams) error {
	return s.scout.List(ctx)
}

func (s *Server) CompanyScoutsGetScoutCredits(ctx echo.Context) error {
	return s.scout.GetCredits(ctx)
}

func (s *Server) CompanyScoutsGetScoutQuality(ctx echo.Context) error {
	return s.scout.GetQualityScore(ctx)
}

func (s *Server) CompanyScoutsGetScoutDashboard(ctx echo.Context) error {
	return s.scout.GetDashboard(ctx)
}

func (s *Server) CompanyScoutsGetCompanyScoutDetail(ctx echo.Context, scoutID string) error {
	return s.scout.GetDetail(ctx, scoutID)
}

func (s *Server) CompanyScoutsCompanyScoutReply(ctx echo.Context, scoutID string) error {
	return s.scout.Reply(ctx, scoutID)
}

// --- CandidateScouts ---

func (s *Server) CandidateScoutsListCandidateScouts(ctx echo.Context, _ openapi.CandidateScoutsListCandidateScoutsParams) error {
	return s.candScout.List(ctx)
}

func (s *Server) CandidateScoutsGetCandidateScoutDetail(ctx echo.Context, scoutID string) error {
	return s.candScout.GetDetail(ctx, scoutID)
}

func (s *Server) CandidateScoutsRespondToScout(ctx echo.Context, scoutID string) error {
	return s.candScout.Respond(ctx, scoutID)
}

func (s *Server) CandidateScoutsCandidateScoutReply(ctx echo.Context, scoutID string) error {
	return s.candScout.Reply(ctx, scoutID)
}

func (s *Server) CandidateScoutsBulkDeclineScouts(ctx echo.Context) error {
	return s.candScout.BulkDecline(ctx)
}

func (s *Server) CandidateScoutsBulkRespondScouts(ctx echo.Context) error {
	return s.candScout.BulkRespond(ctx)
}

// --- JobApplications ---

func (s *Server) CandidateApplicationsApplyToJob(ctx echo.Context) error {
	return s.jobApp.Apply(ctx)
}

func (s *Server) CandidateApplicationsListCandidateApplications(ctx echo.Context) error {
	return s.jobApp.ListByCandidate(ctx)
}

func (s *Server) CandidateApplicationsCheckApplied(ctx echo.Context, _ openapi.CandidateApplicationsCheckAppliedParams) error {
	return s.jobApp.CheckApplied(ctx)
}

func (s *Server) CandidateApplicationsWithdrawApplication(ctx echo.Context, applicationID string) error {
	return s.jobApp.Withdraw(ctx, applicationID)
}

func (s *Server) CompanyApplicationsListCompanyApplications(ctx echo.Context, _ openapi.CompanyApplicationsListCompanyApplicationsParams) error {
	return s.jobApp.ListByCompany(ctx)
}

func (s *Server) CompanyApplicationsGetApplication(ctx echo.Context, applicationID string) error {
	return s.jobApp.GetByID(ctx, applicationID)
}

func (s *Server) CompanyApplicationsUpdateApplicationStatus(ctx echo.Context, applicationID string) error {
	return s.jobApp.UpdateStatus(ctx, applicationID)
}
