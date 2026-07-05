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
	messaging     *MessagingController
	article       *ArticleController
	companyProf   *CompanyProfileController
	savedCand     *SavedCandidateController
	talentSearch  *TalentSearchController
	companyTeam   *CompanyTeamController
	jobPosting    *JobPostingController
	interview     *InterviewController

	// User-facing routes served by admin controllers (spec-covered, pool直結のまま).
	adminIntReport *AdminIntegratedReportController

	// Job image uploads are standalone echo.HandlerFuncs built with
	// HandleImageUpload(storage, subdir); wired here for interface conformance.
	uploadTeamMemberPhoto echo.HandlerFunc
	uploadGalleryImage    echo.HandlerFunc
	uploadJobCoverImage   echo.HandlerFunc
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
	messaging *MessagingController,
	article *ArticleController,
	companyProf *CompanyProfileController,
	savedCand *SavedCandidateController,
	talentSearch *TalentSearchController,
	companyTeam *CompanyTeamController,
	jobPosting *JobPostingController,
	interview *InterviewController,
	adminIntReport *AdminIntegratedReportController,
	uploadTeamMemberPhoto echo.HandlerFunc,
	uploadGalleryImage echo.HandlerFunc,
	uploadJobCoverImage echo.HandlerFunc,
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
		messaging:     messaging,
		article:       article,
		companyProf:   companyProf,
		savedCand:     savedCand,
		talentSearch:  talentSearch,
		companyTeam:   companyTeam,
		jobPosting:    jobPosting,
		interview:     interview,

		adminIntReport: adminIntReport,

		uploadTeamMemberPhoto: uploadTeamMemberPhoto,
		uploadGalleryImage:    uploadGalleryImage,
		uploadJobCoverImage:   uploadJobCoverImage,
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

func (s *Server) UsersGetUserById(ctx echo.Context, id string) error {
	return s.user.GetByID(ctx, id)
}

func (s *Server) UsersUploadUserImage(ctx echo.Context, username string, _ openapi.UsersUploadUserImageParams) error {
	return s.user.UploadImage(ctx, username)
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

// --- Messaging ---

func (s *Server) CandidateMessagingStartCandidateConversation(ctx echo.Context) error {
	return s.messaging.StartCandidateConversation(ctx)
}

func (s *Server) CandidateMessagingListCandidateConversations(ctx echo.Context, _ openapi.CandidateMessagingListCandidateConversationsParams) error {
	return s.messaging.ListConversationsByCandidate(ctx)
}

func (s *Server) CandidateMessagingGetCandidateConversation(ctx echo.Context, conversationID string) error {
	return s.messaging.GetConversationAsCandidate(ctx, conversationID)
}

func (s *Server) CandidateMessagingListCandidateMessages(ctx echo.Context, conversationID string, _ openapi.CandidateMessagingListCandidateMessagesParams) error {
	return s.messaging.ListMessagesAsCandidate(ctx, conversationID)
}

func (s *Server) CandidateMessagingSendCandidateMessage(ctx echo.Context, conversationID string) error {
	return s.messaging.SendMessageAsCandidate(ctx, conversationID)
}

func (s *Server) CandidateMessagingMarkCandidateConversationRead(ctx echo.Context, conversationID string) error {
	return s.messaging.MarkReadAsCandidate(ctx, conversationID)
}

func (s *Server) CandidateMessagingCountCandidateUnreadMessages(ctx echo.Context) error {
	return s.messaging.CountUnreadByCandidate(ctx)
}

func (s *Server) CompanyMessagingStartCompanyConversation(ctx echo.Context) error {
	return s.messaging.StartConversation(ctx)
}

func (s *Server) CompanyMessagingListCompanyConversations(ctx echo.Context, _ openapi.CompanyMessagingListCompanyConversationsParams) error {
	return s.messaging.ListConversationsByCompany(ctx)
}

func (s *Server) CompanyMessagingGetCompanyConversation(ctx echo.Context, conversationID string) error {
	return s.messaging.GetConversationAsCompany(ctx, conversationID)
}

func (s *Server) CompanyMessagingListCompanyMessages(ctx echo.Context, conversationID string, _ openapi.CompanyMessagingListCompanyMessagesParams) error {
	return s.messaging.ListMessagesAsCompany(ctx, conversationID)
}

func (s *Server) CompanyMessagingSendCompanyMessage(ctx echo.Context, conversationID string) error {
	return s.messaging.SendMessageAsCompany(ctx, conversationID)
}

func (s *Server) CompanyMessagingMarkCompanyConversationRead(ctx echo.Context, conversationID string) error {
	return s.messaging.MarkReadAsCompany(ctx, conversationID)
}

func (s *Server) CompanyMessagingCountCompanyUnreadMessages(ctx echo.Context) error {
	return s.messaging.CountUnreadByCompany(ctx)
}

// --- Articles ---

func (s *Server) ArticlesListArticles(ctx echo.Context, _ openapi.ArticlesListArticlesParams) error {
	return s.article.List(ctx)
}

func (s *Server) ArticlesListMyArticles(ctx echo.Context, _ openapi.ArticlesListMyArticlesParams) error {
	return s.article.ListMine(ctx)
}

func (s *Server) ArticlesUploadArticleImage(ctx echo.Context) error {
	return s.article.UploadImage(ctx)
}

func (s *Server) ArticlesCreateArticle(ctx echo.Context) error {
	return s.article.CreateAsUser(ctx)
}

func (s *Server) ArticlesGetArticle(ctx echo.Context, articleID string) error {
	return s.article.GetByID(ctx, articleID)
}

func (s *Server) ArticlesUpdateArticle(ctx echo.Context, articleID string) error {
	return s.article.UpdateAsUser(ctx, articleID)
}

func (s *Server) ArticlesDeleteArticle(ctx echo.Context, articleID string) error {
	return s.article.DeleteAsUser(ctx, articleID)
}

func (s *Server) ArticlesPublishArticle(ctx echo.Context, articleID string) error {
	return s.article.PublishAsUser(ctx, articleID)
}

func (s *Server) ArticlesCreateArticleCheckout(ctx echo.Context, articleID string) error {
	return s.article.CreateCheckout(ctx, articleID)
}

func (s *Server) CompanyArticlesCreateCompanyArticle(ctx echo.Context) error {
	return s.article.CreateAsCompany(ctx)
}

func (s *Server) CompanyArticlesUpdateCompanyArticle(ctx echo.Context, articleID string) error {
	return s.article.UpdateAsCompany(ctx, articleID)
}

func (s *Server) CompanyArticlesDeleteCompanyArticle(ctx echo.Context, articleID string) error {
	return s.article.DeleteAsCompany(ctx, articleID)
}

func (s *Server) CompanyArticlesPublishCompanyArticle(ctx echo.Context, articleID string) error {
	return s.article.PublishAsCompany(ctx, articleID)
}

// --- CompanyProfile ---

func (s *Server) PublicCompanyProfilesGetPublicCompanyProfile(ctx echo.Context, _ string) error {
	return s.companyProf.GetPublicProfile(ctx)
}

func (s *Server) CompanyProfilesGetCompanyProfile(ctx echo.Context) error {
	return s.companyProf.GetProfile(ctx)
}

func (s *Server) CompanyProfilesUpdateCompanyProfile(ctx echo.Context) error {
	return s.companyProf.UpdateProfile(ctx)
}

func (s *Server) CompanyProfilesUploadCompanyProfileImage(ctx echo.Context, _ openapi.CompanyProfilesUploadCompanyProfileImageParams) error {
	return s.companyProf.UploadImage(ctx)
}

func (s *Server) CompanyProfilesDeleteCompanyProfileImage(ctx echo.Context, _ openapi.CompanyProfilesDeleteCompanyProfileImageParams) error {
	return s.companyProf.DeleteImage(ctx)
}

// --- SavedCandidates ---

func (s *Server) SavedCandidatesListSavedCandidates(ctx echo.Context, _ openapi.SavedCandidatesListSavedCandidatesParams) error {
	return s.savedCand.List(ctx)
}

func (s *Server) SavedCandidatesCountSavedCandidates(ctx echo.Context) error {
	return s.savedCand.Count(ctx)
}

func (s *Server) SavedCandidatesBulkCheckSaved(ctx echo.Context) error {
	return s.savedCand.BulkCheck(ctx)
}

func (s *Server) SavedCandidatesSaveCandidate(ctx echo.Context, _ string) error {
	return s.savedCand.Save(ctx)
}

func (s *Server) SavedCandidatesUnsaveCandidate(ctx echo.Context, _ string) error {
	return s.savedCand.Unsave(ctx)
}

func (s *Server) SavedCandidatesIsCandidateSaved(ctx echo.Context, _ string) error {
	return s.savedCand.IsSaved(ctx)
}

// --- TalentSearch ---

func (s *Server) TalentSearchSearchTalents(ctx echo.Context, _ openapi.TalentSearchSearchTalentsParams) error {
	return s.talentSearch.Search(ctx)
}

func (s *Server) TalentSearchDiagnosticSearchTalents(ctx echo.Context, _ openapi.TalentSearchDiagnosticSearchTalentsParams) error {
	return s.talentSearch.DiagnosticSearch(ctx)
}

func (s *Server) TalentSearchCiDiagnosticSearchTalents(ctx echo.Context, _ openapi.TalentSearchCiDiagnosticSearchTalentsParams) error {
	return s.talentSearch.CIDiagnosticSearch(ctx)
}

func (s *Server) TalentSearchIntegratedDiagnosticSearchTalents(ctx echo.Context, _ openapi.TalentSearchIntegratedDiagnosticSearchTalentsParams) error {
	return s.talentSearch.IntegratedDiagnosticSearch(ctx)
}

// --- CompanyTeams ---

func (s *Server) PublicTeamScoresGetPublicTeamScores(ctx echo.Context, id string) error {
	return s.companyTeam.GetPublicTeamScores(ctx, id)
}

func (s *Server) CompanyTeamsListTeams(ctx echo.Context) error {
	return s.companyTeam.ListTeams(ctx)
}

func (s *Server) CompanyTeamsCreateTeam(ctx echo.Context) error {
	return s.companyTeam.CreateTeam(ctx)
}

func (s *Server) CompanyTeamsGetTeam(ctx echo.Context, teamID string) error {
	return s.companyTeam.GetTeam(ctx, teamID)
}

func (s *Server) CompanyTeamsUpdateTeam(ctx echo.Context, teamID string) error {
	return s.companyTeam.UpdateTeam(ctx, teamID)
}

func (s *Server) CompanyTeamsDeleteTeam(ctx echo.Context, teamID string) error {
	return s.companyTeam.DeleteTeam(ctx, teamID)
}

func (s *Server) CompanyTeamsAddTeamMember(ctx echo.Context, teamID string) error {
	return s.companyTeam.AddMember(ctx, teamID)
}

func (s *Server) CompanyTeamsRemoveTeamMember(ctx echo.Context, teamID, memberID string) error {
	return s.companyTeam.RemoveMember(ctx, teamID, memberID)
}

func (s *Server) CompanyTeamsGetTeamScores(ctx echo.Context, teamID string) error {
	return s.companyTeam.GetTeamScores(ctx, teamID)
}

func (s *Server) CompanyTeamsSetAceMember(ctx echo.Context, teamID, memberID string) error {
	return s.companyTeam.SetAceMember(ctx, teamID, memberID)
}

func (s *Server) CompanyTeamsUnsetAceMember(ctx echo.Context, teamID string) error {
	return s.companyTeam.UnsetAceMember(ctx, teamID)
}

// --- JobPostings ---

func (s *Server) CompanyJobPostingsUploadTeamMemberPhoto(ctx echo.Context) error {
	return s.uploadTeamMemberPhoto(ctx)
}

func (s *Server) CompanyJobPostingsUploadGalleryImage(ctx echo.Context) error {
	return s.uploadGalleryImage(ctx)
}

func (s *Server) CompanyJobPostingsUploadJobCoverImage(ctx echo.Context) error {
	return s.uploadJobCoverImage(ctx)
}

func (s *Server) CompanyJobPostingsCreateJobPosting(ctx echo.Context) error {
	return s.jobPosting.Create(ctx)
}

func (s *Server) CompanyJobPostingsListCompanyJobPostings(ctx echo.Context) error {
	return s.jobPosting.List(ctx)
}

func (s *Server) CompanyJobPostingsGetCompanyJobPosting(ctx echo.Context, jobID string) error {
	return s.jobPosting.Get(ctx, jobID)
}

func (s *Server) CompanyJobPostingsUpdateJobPosting(ctx echo.Context, jobID string) error {
	return s.jobPosting.Update(ctx, jobID)
}

func (s *Server) CompanyJobPostingsDeleteJobPosting(ctx echo.Context, jobID string) error {
	return s.jobPosting.Delete(ctx, jobID)
}

func (s *Server) PublicJobPostingsListPublicJobPostings(ctx echo.Context, _ openapi.PublicJobPostingsListPublicJobPostingsParams) error {
	return s.jobPosting.ListPublic(ctx)
}

func (s *Server) PublicJobPostingsGetPublicJobPosting(ctx echo.Context, jobID string) error {
	return s.jobPosting.GetPublic(ctx, jobID)
}

// --- Interviews ---

func (s *Server) CompanyInterviewsProposeInterview(ctx echo.Context) error {
	return s.interview.Propose(ctx)
}

func (s *Server) CompanyInterviewsGetPendingProposal(ctx echo.Context, _ string) error {
	return s.interview.GetPendingProposal(ctx)
}

func (s *Server) CompanyInterviewsListCompanyInterviews(ctx echo.Context, _ openapi.CompanyInterviewsListCompanyInterviewsParams) error {
	return s.interview.ListByCompany(ctx)
}

func (s *Server) CompanyInterviewsCancelCompanyInterview(ctx echo.Context, _ string) error {
	return s.interview.CancelInterview(ctx)
}

func (s *Server) CandidateInterviewsListCandidateInterviews(ctx echo.Context) error {
	return s.interview.ListByCandidate(ctx)
}

func (s *Server) CandidateInterviewsSelectInterviewSlot(ctx echo.Context, _ string) error {
	return s.interview.SelectSlot(ctx)
}

func (s *Server) CandidateInterviewsGetProposalSlots(ctx echo.Context, _ string) error {
	return s.interview.GetProposalSlots(ctx)
}

func (s *Server) CandidateInterviewsCancelCandidateInterview(ctx echo.Context, _ string) error {
	return s.interview.CancelInterview(ctx)
}

// --- IntegratedReport (user-facing routes served by AdminIntegratedReportController) ---

func (s *Server) IntegratedReportCreateIntegratedReportRequest(ctx echo.Context) error {
	return s.adminIntReport.CreateRequest(ctx)
}

func (s *Server) IntegratedReportGetMyIntegratedReport(ctx echo.Context) error {
	return s.adminIntReport.GetReportByUser(ctx)
}

func (s *Server) IntegratedReportGetIntegratedReportStatus(ctx echo.Context) error {
	return s.adminIntReport.GetRequestStatus(ctx)
}

func (s *Server) IntegratedReportGetIntegratedReport(ctx echo.Context, requestID string) error {
	return s.adminIntReport.GetReport(ctx, requestID)
}

func (s *Server) IntegratedReportGetLatestIntegratedRequest(ctx echo.Context, userID string) error {
	return s.adminIntReport.GetLatestRequest(ctx, userID)
}
