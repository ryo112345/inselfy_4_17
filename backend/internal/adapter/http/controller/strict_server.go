package controller

import (
	"context"
	"errors"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
)

// StrictServer implements the generated StrictServerInterface（全11グループの
// 移行完了により embed は撤去済み・コンパイル時適合が有効）。
//
// Controllers are installed by the wire_*.go of each migrated group through
// that group's Wire*Group setter before the server starts serving; the
// per-group setters keep "wire に代入し忘れた controller" a compile error
// instead of a nil dereference at request time.
type StrictServer struct {
	user         *UserController
	experience   *ExperienceController
	education    *EducationController
	skill        *SkillController
	follow       *FollowController
	similarUsers *SimilarUsersController
	resume       *ResumeController

	post    *PostController
	article *ArticleController

	search *SearchController

	workValues     *WorkValuesController
	careerInterest *CareerInterestController
	teamDiagnose   *TeamDiagnoseController

	auth        *AuthController
	companyAuth *CompanyAuthController

	companyProfile *CompanyProfileController
	companyTeam    *CompanyTeamController
	talentSearch   *TalentSearchController
	savedCandidate *SavedCandidateController

	scout          *ScoutController
	candidateScout *CandidateScoutController
	scoutSettings  *ScoutSettingsController
	scoutTemplate  *ScoutTemplateController

	jobPosting     *JobPostingController
	jobApplication *JobApplicationController

	messaging    *MessagingController
	notification *NotificationController

	interview *InterviewController

	adminAdmin     *AdminAdminController
	adminUser      *AdminUserController
	adminCompany   *AdminCompanyController
	adminReport    *AdminReportController
	adminCIReport  *AdminCIReportController
	adminIntReport *AdminIntegratedReportController
	adminResume    *AdminResumeController
}

// 契約遵守のコンパイル時強制（手順書 3-0: 全グループ移行完了で embed を外して復活）。
var _ openapi.StrictServerInterface = (*StrictServer)(nil)

// NewStrictServer wires controllers into the generated StrictServerInterface.
// Feature groups add their controllers here as they migrate off echo.
func NewStrictServer() *StrictServer {
	return &StrictServer{}
}

// WireUserGroup installs the wire_user controllers
// (docs/strict-server-migration.md Phase 3-1 グループ1).
func (s *StrictServer) WireUserGroup(
	user *UserController,
	experience *ExperienceController,
	education *EducationController,
	skill *SkillController,
	follow *FollowController,
	similarUsers *SimilarUsersController,
	resume *ResumeController,
) {
	s.user = user
	s.experience = experience
	s.education = education
	s.skill = skill
	s.follow = follow
	s.similarUsers = similarUsers
	s.resume = resume
}

// WireContentGroup installs the wire_content controllers
// (docs/strict-server-migration.md Phase 3-1 グループ2)。
// Stripe webhook はスペック外のため対象外（wire_content.go が echo に登録し続ける）。
func (s *StrictServer) WireContentGroup(post *PostController, article *ArticleController) {
	s.post = post
	s.article = article
}

// WireSearchGroup installs the wire_search controller
// (docs/strict-server-migration.md Phase 3-1 グループ3)。
func (s *StrictServer) WireSearchGroup(search *SearchController) {
	s.search = search
}

// WireDiagnosisGroup installs the wire_diagnosis controllers
// (docs/strict-server-migration.md Phase 3-1 グループ4)。
func (s *StrictServer) WireDiagnosisGroup(
	workValues *WorkValuesController,
	careerInterest *CareerInterestController,
	teamDiagnose *TeamDiagnoseController,
) {
	s.workValues = workValues
	s.careerInterest = careerInterest
	s.teamDiagnose = teamDiagnose
}

// WireAuthGroup installs the wire_auth controllers
// (docs/strict-server-migration.md Phase 3-1 グループ5)。
func (s *StrictServer) WireAuthGroup(auth *AuthController, companyAuth *CompanyAuthController) {
	s.auth = auth
	s.companyAuth = companyAuth
}

// WireCompanyGroup installs the wire_company controllers
// (docs/strict-server-migration.md Phase 3-1 グループ6)。
func (s *StrictServer) WireCompanyGroup(
	companyProfile *CompanyProfileController,
	companyTeam *CompanyTeamController,
	talentSearch *TalentSearchController,
	savedCandidate *SavedCandidateController,
) {
	s.companyProfile = companyProfile
	s.companyTeam = companyTeam
	s.talentSearch = talentSearch
	s.savedCandidate = savedCandidate
}

// WireScoutGroup installs the wire_scout controllers
// (docs/strict-server-migration.md Phase 3-1 グループ7)。
func (s *StrictServer) WireScoutGroup(
	scout *ScoutController,
	candidateScout *CandidateScoutController,
	scoutSettings *ScoutSettingsController,
	scoutTemplate *ScoutTemplateController,
) {
	s.scout = scout
	s.candidateScout = candidateScout
	s.scoutSettings = scoutSettings
	s.scoutTemplate = scoutTemplate
}

// WireJobsGroup installs the wire_jobs controllers
// (docs/strict-server-migration.md Phase 3-1 グループ8)。
func (s *StrictServer) WireJobsGroup(
	jobPosting *JobPostingController,
	jobApplication *JobApplicationController,
) {
	s.jobPosting = jobPosting
	s.jobApplication = jobApplication
}

// WireMessagingGroup installs the wire_messaging controllers
// (docs/strict-server-migration.md Phase 3-1 グループ9)。
func (s *StrictServer) WireMessagingGroup(
	messaging *MessagingController,
	notification *NotificationController,
) {
	s.messaging = messaging
	s.notification = notification
}

// WireInterviewGroup installs the wire_interview controller
// (docs/strict-server-migration.md Phase 3-1 グループ10)。
// WebSocket（/api/ws）はスペック外のため対象外（SetWS 連携は BuildServer が行う）。
func (s *StrictServer) WireInterviewGroup(interview *InterviewController) {
	s.interview = interview
}

// WireAdminGroup installs the wire_admin controllers
// (docs/strict-server-migration.md Phase 3-1 グループ11)。admin コントローラは
// 設計上 pool 直結のまま（CLAUDE.md の例外規定）。共有コントローラが
// user-facing のレポート7 operation も提供する。
func (s *StrictServer) WireAdminGroup(
	adminAdmin *AdminAdminController,
	adminUser *AdminUserController,
	adminCompany *AdminCompanyController,
	adminReport *AdminReportController,
	adminCIReport *AdminCIReportController,
	adminIntReport *AdminIntegratedReportController,
	adminResume *AdminResumeController,
) {
	s.adminAdmin = adminAdmin
	s.adminUser = adminUser
	s.adminCompany = adminCompany
	s.adminReport = adminReport
	s.adminCIReport = adminCIReport
	s.adminIntReport = adminIntReport
	s.adminResume = adminResume
}

// --- Resumes（候補者側）---

func (s *StrictServer) ResumesUploadResume(ctx context.Context, req openapi.ResumesUploadResumeRequestObject) (openapi.ResumesUploadResumeResponseObject, error) {
	return s.resume.Upload(ctx, req)
}

func (s *StrictServer) ResumesGetMyResume(ctx context.Context, req openapi.ResumesGetMyResumeRequestObject) (openapi.ResumesGetMyResumeResponseObject, error) {
	return s.resume.GetMine(ctx, req)
}

// --- Admin: 職務経歴書 ---

func (s *StrictServer) AdminListResumes(ctx context.Context, req openapi.AdminListResumesRequestObject) (openapi.AdminListResumesResponseObject, error) {
	return s.adminResume.List(ctx, req)
}

func (s *StrictServer) AdminDownloadResume(ctx context.Context, req openapi.AdminDownloadResumeRequestObject) (openapi.AdminDownloadResumeResponseObject, error) {
	return s.adminResume.Download(ctx, req)
}

func (s *StrictServer) AdminGetResumeDraft(ctx context.Context, req openapi.AdminGetResumeDraftRequestObject) (openapi.AdminGetResumeDraftResponseObject, error) {
	return s.adminResume.GetDraft(ctx, req)
}

// PUT /api/admin/resumes/{resumeId}/draft は raw JSON デコードのため strict を
// 経由しない（AdminResumeController.SaveDraftHTTP を wire_admin.go が直接
// mux に登録する）。このスタブは UsersUpdateUserProfile と同じ扱いで到達しない。
func (s *StrictServer) AdminSaveResumeDraft(context.Context, openapi.AdminSaveResumeDraftRequestObject) (openapi.AdminSaveResumeDraftResponseObject, error) {
	return nil, errors.New("unreachable: PUT /api/admin/resumes/{resumeId}/draft is served by SaveDraftHTTP")
}

func (s *StrictServer) AdminApproveResume(ctx context.Context, req openapi.AdminApproveResumeRequestObject) (openapi.AdminApproveResumeResponseObject, error) {
	return s.adminResume.Approve(ctx, req)
}

func (s *StrictServer) AdminRejectResume(ctx context.Context, req openapi.AdminRejectResumeRequestObject) (openapi.AdminRejectResumeResponseObject, error) {
	return s.adminResume.Reject(ctx, req)
}

// --- Users ---
// PATCH /api/users/{username} は raw JSON デコードのため strict を経由しない
// （UserController.UpdateProfileHTTP を wire_user.go が直接 mux に登録する）。
// UsersUpdateUserProfile はインターフェース適合のためのスタブで、ルートは
// 手書きハンドラに登録されるため到達しない。
func (s *StrictServer) UsersUpdateUserProfile(context.Context, openapi.UsersUpdateUserProfileRequestObject) (openapi.UsersUpdateUserProfileResponseObject, error) {
	return nil, errors.New("unreachable: PATCH /api/users/{username} is served by UpdateProfileHTTP")
}

func (s *StrictServer) UsersCreateUser(ctx context.Context, req openapi.UsersCreateUserRequestObject) (openapi.UsersCreateUserResponseObject, error) {
	return s.user.Create(ctx, req)
}

func (s *StrictServer) UsersGetUserByUsername(ctx context.Context, req openapi.UsersGetUserByUsernameRequestObject) (openapi.UsersGetUserByUsernameResponseObject, error) {
	return s.user.GetByUsername(ctx, req)
}

func (s *StrictServer) UsersGetUserById(ctx context.Context, req openapi.UsersGetUserByIdRequestObject) (openapi.UsersGetUserByIdResponseObject, error) {
	return s.user.GetByID(ctx, req)
}

func (s *StrictServer) UsersUploadUserImage(ctx context.Context, req openapi.UsersUploadUserImageRequestObject) (openapi.UsersUploadUserImageResponseObject, error) {
	return s.user.UploadImage(ctx, req)
}

// --- SimilarUsers ---

func (s *StrictServer) SimilarUsersGetSimilarUsers(ctx context.Context, req openapi.SimilarUsersGetSimilarUsersRequestObject) (openapi.SimilarUsersGetSimilarUsersResponseObject, error) {
	return s.similarUsers.GetSimilarUsers(ctx, req)
}

// --- Experiences ---

func (s *StrictServer) ExperiencesListExperiences(ctx context.Context, req openapi.ExperiencesListExperiencesRequestObject) (openapi.ExperiencesListExperiencesResponseObject, error) {
	return s.experience.List(ctx, req)
}

func (s *StrictServer) ExperiencesCreateExperience(ctx context.Context, req openapi.ExperiencesCreateExperienceRequestObject) (openapi.ExperiencesCreateExperienceResponseObject, error) {
	return s.experience.Create(ctx, req)
}

func (s *StrictServer) ExperiencesUpdateExperience(ctx context.Context, req openapi.ExperiencesUpdateExperienceRequestObject) (openapi.ExperiencesUpdateExperienceResponseObject, error) {
	return s.experience.Update(ctx, req)
}

func (s *StrictServer) ExperiencesDeleteExperience(ctx context.Context, req openapi.ExperiencesDeleteExperienceRequestObject) (openapi.ExperiencesDeleteExperienceResponseObject, error) {
	return s.experience.Delete(ctx, req)
}

// --- Educations ---

func (s *StrictServer) EducationsListEducations(ctx context.Context, req openapi.EducationsListEducationsRequestObject) (openapi.EducationsListEducationsResponseObject, error) {
	return s.education.List(ctx, req)
}

func (s *StrictServer) EducationsCreateEducation(ctx context.Context, req openapi.EducationsCreateEducationRequestObject) (openapi.EducationsCreateEducationResponseObject, error) {
	return s.education.Create(ctx, req)
}

func (s *StrictServer) EducationsUpdateEducation(ctx context.Context, req openapi.EducationsUpdateEducationRequestObject) (openapi.EducationsUpdateEducationResponseObject, error) {
	return s.education.Update(ctx, req)
}

func (s *StrictServer) EducationsDeleteEducation(ctx context.Context, req openapi.EducationsDeleteEducationRequestObject) (openapi.EducationsDeleteEducationResponseObject, error) {
	return s.education.Delete(ctx, req)
}

// --- Skills ---

func (s *StrictServer) SkillsListSkills(ctx context.Context, req openapi.SkillsListSkillsRequestObject) (openapi.SkillsListSkillsResponseObject, error) {
	return s.skill.List(ctx, req)
}

func (s *StrictServer) SkillsAttachSkill(ctx context.Context, req openapi.SkillsAttachSkillRequestObject) (openapi.SkillsAttachSkillResponseObject, error) {
	return s.skill.Attach(ctx, req)
}

func (s *StrictServer) SkillsDetachSkill(ctx context.Context, req openapi.SkillsDetachSkillRequestObject) (openapi.SkillsDetachSkillResponseObject, error) {
	return s.skill.Detach(ctx, req)
}

// --- Follows ---

func (s *StrictServer) FollowsFollowUser(ctx context.Context, req openapi.FollowsFollowUserRequestObject) (openapi.FollowsFollowUserResponseObject, error) {
	return s.follow.Follow(ctx, req)
}

func (s *StrictServer) FollowsUnfollowUser(ctx context.Context, req openapi.FollowsUnfollowUserRequestObject) (openapi.FollowsUnfollowUserResponseObject, error) {
	return s.follow.Unfollow(ctx, req)
}

func (s *StrictServer) FollowsGetFollowStatus(ctx context.Context, req openapi.FollowsGetFollowStatusRequestObject) (openapi.FollowsGetFollowStatusResponseObject, error) {
	return s.follow.GetFollowStatus(ctx, req)
}

func (s *StrictServer) FollowsListFollowers(ctx context.Context, req openapi.FollowsListFollowersRequestObject) (openapi.FollowsListFollowersResponseObject, error) {
	return s.follow.GetFollowers(ctx, req)
}

func (s *StrictServer) FollowsListFollowing(ctx context.Context, req openapi.FollowsListFollowingRequestObject) (openapi.FollowsListFollowingResponseObject, error) {
	return s.follow.GetFollowing(ctx, req)
}

// --- Posts ---

func (s *StrictServer) PostsCreatePost(ctx context.Context, req openapi.PostsCreatePostRequestObject) (openapi.PostsCreatePostResponseObject, error) {
	return s.post.Create(ctx, req)
}

func (s *StrictServer) PostsGetPost(ctx context.Context, req openapi.PostsGetPostRequestObject) (openapi.PostsGetPostResponseObject, error) {
	return s.post.GetByID(ctx, req)
}

func (s *StrictServer) PostsListTimelinePosts(ctx context.Context, req openapi.PostsListTimelinePostsRequestObject) (openapi.PostsListTimelinePostsResponseObject, error) {
	return s.post.ListTimeline(ctx, req)
}

func (s *StrictServer) PostsListPostsByUser(ctx context.Context, req openapi.PostsListPostsByUserRequestObject) (openapi.PostsListPostsByUserResponseObject, error) {
	return s.post.ListByUserID(ctx, req)
}

func (s *StrictServer) PostsListLikedPostsByUser(ctx context.Context, req openapi.PostsListLikedPostsByUserRequestObject) (openapi.PostsListLikedPostsByUserResponseObject, error) {
	return s.post.ListLikedByUserID(ctx, req)
}

func (s *StrictServer) PostsDeletePost(ctx context.Context, req openapi.PostsDeletePostRequestObject) (openapi.PostsDeletePostResponseObject, error) {
	return s.post.Delete(ctx, req)
}

func (s *StrictServer) PostsTogglePostLike(ctx context.Context, req openapi.PostsTogglePostLikeRequestObject) (openapi.PostsTogglePostLikeResponseObject, error) {
	return s.post.ToggleLike(ctx, req)
}

func (s *StrictServer) PostsTogglePostRepost(ctx context.Context, req openapi.PostsTogglePostRepostRequestObject) (openapi.PostsTogglePostRepostResponseObject, error) {
	return s.post.ToggleRepost(ctx, req)
}

func (s *StrictServer) PostsCreatePostComment(ctx context.Context, req openapi.PostsCreatePostCommentRequestObject) (openapi.PostsCreatePostCommentResponseObject, error) {
	return s.post.CreateComment(ctx, req)
}

func (s *StrictServer) PostsListPostComments(ctx context.Context, req openapi.PostsListPostCommentsRequestObject) (openapi.PostsListPostCommentsResponseObject, error) {
	return s.post.ListComments(ctx, req)
}

func (s *StrictServer) PostsDeletePostComment(ctx context.Context, req openapi.PostsDeletePostCommentRequestObject) (openapi.PostsDeletePostCommentResponseObject, error) {
	return s.post.DeleteComment(ctx, req)
}

// --- Articles（ユーザー著者） ---

func (s *StrictServer) ArticlesListArticles(ctx context.Context, req openapi.ArticlesListArticlesRequestObject) (openapi.ArticlesListArticlesResponseObject, error) {
	return s.article.List(ctx, req)
}

func (s *StrictServer) ArticlesGetArticle(ctx context.Context, req openapi.ArticlesGetArticleRequestObject) (openapi.ArticlesGetArticleResponseObject, error) {
	return s.article.GetByID(ctx, req)
}

func (s *StrictServer) ArticlesListMyArticles(ctx context.Context, req openapi.ArticlesListMyArticlesRequestObject) (openapi.ArticlesListMyArticlesResponseObject, error) {
	return s.article.ListMine(ctx, req)
}

func (s *StrictServer) ArticlesCreateArticle(ctx context.Context, req openapi.ArticlesCreateArticleRequestObject) (openapi.ArticlesCreateArticleResponseObject, error) {
	return s.article.CreateAsUser(ctx, req)
}

func (s *StrictServer) ArticlesUpdateArticle(ctx context.Context, req openapi.ArticlesUpdateArticleRequestObject) (openapi.ArticlesUpdateArticleResponseObject, error) {
	return s.article.UpdateAsUser(ctx, req)
}

func (s *StrictServer) ArticlesDeleteArticle(ctx context.Context, req openapi.ArticlesDeleteArticleRequestObject) (openapi.ArticlesDeleteArticleResponseObject, error) {
	return s.article.DeleteAsUser(ctx, req)
}

func (s *StrictServer) ArticlesPublishArticle(ctx context.Context, req openapi.ArticlesPublishArticleRequestObject) (openapi.ArticlesPublishArticleResponseObject, error) {
	return s.article.PublishAsUser(ctx, req)
}

func (s *StrictServer) ArticlesCreateArticleCheckout(ctx context.Context, req openapi.ArticlesCreateArticleCheckoutRequestObject) (openapi.ArticlesCreateArticleCheckoutResponseObject, error) {
	return s.article.CreateCheckout(ctx, req)
}

func (s *StrictServer) ArticlesUploadArticleImage(ctx context.Context, req openapi.ArticlesUploadArticleImageRequestObject) (openapi.ArticlesUploadArticleImageResponseObject, error) {
	return s.article.UploadImage(ctx, req)
}

// --- Articles（企業著者） ---

func (s *StrictServer) CompanyArticlesCreateCompanyArticle(ctx context.Context, req openapi.CompanyArticlesCreateCompanyArticleRequestObject) (openapi.CompanyArticlesCreateCompanyArticleResponseObject, error) {
	return s.article.CreateAsCompany(ctx, req)
}

func (s *StrictServer) CompanyArticlesUpdateCompanyArticle(ctx context.Context, req openapi.CompanyArticlesUpdateCompanyArticleRequestObject) (openapi.CompanyArticlesUpdateCompanyArticleResponseObject, error) {
	return s.article.UpdateAsCompany(ctx, req)
}

func (s *StrictServer) CompanyArticlesDeleteCompanyArticle(ctx context.Context, req openapi.CompanyArticlesDeleteCompanyArticleRequestObject) (openapi.CompanyArticlesDeleteCompanyArticleResponseObject, error) {
	return s.article.DeleteAsCompany(ctx, req)
}

func (s *StrictServer) CompanyArticlesPublishCompanyArticle(ctx context.Context, req openapi.CompanyArticlesPublishCompanyArticleRequestObject) (openapi.CompanyArticlesPublishCompanyArticleResponseObject, error) {
	return s.article.PublishAsCompany(ctx, req)
}

// --- Search ---

func (s *StrictServer) SearchSearchAll(ctx context.Context, req openapi.SearchSearchAllRequestObject) (openapi.SearchSearchAllResponseObject, error) {
	return s.search.SearchAll(ctx, req)
}

func (s *StrictServer) SearchSearchUsers(ctx context.Context, req openapi.SearchSearchUsersRequestObject) (openapi.SearchSearchUsersResponseObject, error) {
	return s.search.SearchUsers(ctx, req)
}

func (s *StrictServer) SearchSearchArticles(ctx context.Context, req openapi.SearchSearchArticlesRequestObject) (openapi.SearchSearchArticlesResponseObject, error) {
	return s.search.SearchArticles(ctx, req)
}

func (s *StrictServer) SearchSearchPosts(ctx context.Context, req openapi.SearchSearchPostsRequestObject) (openapi.SearchSearchPostsResponseObject, error) {
	return s.search.SearchPosts(ctx, req)
}

func (s *StrictServer) SearchSearchJobs(ctx context.Context, req openapi.SearchSearchJobsRequestObject) (openapi.SearchSearchJobsResponseObject, error) {
	return s.search.SearchJobs(ctx, req)
}

// --- Work Values ---

func (s *StrictServer) WorkValuesWvStartSession(ctx context.Context, req openapi.WorkValuesWvStartSessionRequestObject) (openapi.WorkValuesWvStartSessionResponseObject, error) {
	return s.workValues.StartSession(ctx, req)
}

func (s *StrictServer) WorkValuesWvSubmitResult(ctx context.Context, req openapi.WorkValuesWvSubmitResultRequestObject) (openapi.WorkValuesWvSubmitResultResponseObject, error) {
	return s.workValues.SubmitResult(ctx, req)
}

func (s *StrictServer) WorkValuesWvGetLatestResult(ctx context.Context, req openapi.WorkValuesWvGetLatestResultRequestObject) (openapi.WorkValuesWvGetLatestResultResponseObject, error) {
	return s.workValues.GetLatestResult(ctx, req)
}

func (s *StrictServer) WorkValuesWvGetResultBySession(ctx context.Context, req openapi.WorkValuesWvGetResultBySessionRequestObject) (openapi.WorkValuesWvGetResultBySessionResponseObject, error) {
	return s.workValues.GetResultBySessionID(ctx, req)
}

func (s *StrictServer) WorkValuesWvRequestAiReport(ctx context.Context, req openapi.WorkValuesWvRequestAiReportRequestObject) (openapi.WorkValuesWvRequestAiReportResponseObject, error) {
	return s.workValues.RequestAiReport(ctx, req)
}

// --- Career Interest ---

func (s *StrictServer) CareerInterestCiStartSession(ctx context.Context, req openapi.CareerInterestCiStartSessionRequestObject) (openapi.CareerInterestCiStartSessionResponseObject, error) {
	return s.careerInterest.StartSession(ctx, req)
}

func (s *StrictServer) CareerInterestCiSubmitResult(ctx context.Context, req openapi.CareerInterestCiSubmitResultRequestObject) (openapi.CareerInterestCiSubmitResultResponseObject, error) {
	return s.careerInterest.SubmitResult(ctx, req)
}

func (s *StrictServer) CareerInterestCiGetLatestResult(ctx context.Context, req openapi.CareerInterestCiGetLatestResultRequestObject) (openapi.CareerInterestCiGetLatestResultResponseObject, error) {
	return s.careerInterest.GetLatestResult(ctx, req)
}

func (s *StrictServer) CareerInterestCiGetResultBySession(ctx context.Context, req openapi.CareerInterestCiGetResultBySessionRequestObject) (openapi.CareerInterestCiGetResultBySessionResponseObject, error) {
	return s.careerInterest.GetResultBySessionID(ctx, req)
}

func (s *StrictServer) CareerInterestCiRequestAiReport(ctx context.Context, req openapi.CareerInterestCiRequestAiReportRequestObject) (openapi.CareerInterestCiRequestAiReportResponseObject, error) {
	return s.careerInterest.RequestAiReport(ctx, req)
}

// --- Team Diagnose ---

func (s *StrictServer) TeamDiagnoseGetDiagnoseByToken(ctx context.Context, req openapi.TeamDiagnoseGetDiagnoseByTokenRequestObject) (openapi.TeamDiagnoseGetDiagnoseByTokenResponseObject, error) {
	return s.teamDiagnose.GetByToken(ctx, req)
}

func (s *StrictServer) TeamDiagnoseUpdateDiagnoseStatus(ctx context.Context, req openapi.TeamDiagnoseUpdateDiagnoseStatusRequestObject) (openapi.TeamDiagnoseUpdateDiagnoseStatusResponseObject, error) {
	return s.teamDiagnose.UpdateStatus(ctx, req)
}

func (s *StrictServer) TeamDiagnoseStartDiagnoseWvSession(ctx context.Context, req openapi.TeamDiagnoseStartDiagnoseWvSessionRequestObject) (openapi.TeamDiagnoseStartDiagnoseWvSessionResponseObject, error) {
	return s.teamDiagnose.StartWVSession(ctx, req)
}

func (s *StrictServer) TeamDiagnoseSubmitDiagnoseWvResult(ctx context.Context, req openapi.TeamDiagnoseSubmitDiagnoseWvResultRequestObject) (openapi.TeamDiagnoseSubmitDiagnoseWvResultResponseObject, error) {
	return s.teamDiagnose.SubmitWVResult(ctx, req)
}

func (s *StrictServer) TeamDiagnoseStartDiagnoseCiSession(ctx context.Context, req openapi.TeamDiagnoseStartDiagnoseCiSessionRequestObject) (openapi.TeamDiagnoseStartDiagnoseCiSessionResponseObject, error) {
	return s.teamDiagnose.StartCISession(ctx, req)
}

func (s *StrictServer) TeamDiagnoseSubmitDiagnoseCiResult(ctx context.Context, req openapi.TeamDiagnoseSubmitDiagnoseCiResultRequestObject) (openapi.TeamDiagnoseSubmitDiagnoseCiResultResponseObject, error) {
	return s.teamDiagnose.SubmitCIResult(ctx, req)
}

// --- Auth（候補者） ---

func (s *StrictServer) AuthGoogleLogin(ctx context.Context, req openapi.AuthGoogleLoginRequestObject) (openapi.AuthGoogleLoginResponseObject, error) {
	return s.auth.GoogleLogin(ctx, req)
}

func (s *StrictServer) AuthRefreshToken(ctx context.Context, req openapi.AuthRefreshTokenRequestObject) (openapi.AuthRefreshTokenResponseObject, error) {
	return s.auth.Refresh(ctx, req)
}

func (s *StrictServer) AuthGetMe(ctx context.Context, req openapi.AuthGetMeRequestObject) (openapi.AuthGetMeResponseObject, error) {
	return s.auth.GetMe(ctx, req)
}

func (s *StrictServer) AuthLogout(ctx context.Context, req openapi.AuthLogoutRequestObject) (openapi.AuthLogoutResponseObject, error) {
	return s.auth.Logout(ctx, req)
}

// --- CompanyAuth（企業） ---

func (s *StrictServer) CompanyAuthCompanyRegister(ctx context.Context, req openapi.CompanyAuthCompanyRegisterRequestObject) (openapi.CompanyAuthCompanyRegisterResponseObject, error) {
	return s.companyAuth.Register(ctx, req)
}

func (s *StrictServer) CompanyAuthCompanyLogin(ctx context.Context, req openapi.CompanyAuthCompanyLoginRequestObject) (openapi.CompanyAuthCompanyLoginResponseObject, error) {
	return s.companyAuth.Login(ctx, req)
}

func (s *StrictServer) CompanyAuthCompanyRefreshToken(ctx context.Context, req openapi.CompanyAuthCompanyRefreshTokenRequestObject) (openapi.CompanyAuthCompanyRefreshTokenResponseObject, error) {
	return s.companyAuth.Refresh(ctx, req)
}

func (s *StrictServer) CompanyAuthCompanyGetMe(ctx context.Context, req openapi.CompanyAuthCompanyGetMeRequestObject) (openapi.CompanyAuthCompanyGetMeResponseObject, error) {
	return s.companyAuth.GetMe(ctx, req)
}

func (s *StrictServer) CompanyAuthCompanyLogout(ctx context.Context, req openapi.CompanyAuthCompanyLogoutRequestObject) (openapi.CompanyAuthCompanyLogoutResponseObject, error) {
	return s.companyAuth.Logout(ctx, req)
}

// --- Company Profile ---

func (s *StrictServer) PublicCompanyProfilesGetPublicCompanyProfile(ctx context.Context, req openapi.PublicCompanyProfilesGetPublicCompanyProfileRequestObject) (openapi.PublicCompanyProfilesGetPublicCompanyProfileResponseObject, error) {
	return s.companyProfile.GetPublicProfile(ctx, req)
}

func (s *StrictServer) CompanyProfilesGetCompanyProfile(ctx context.Context, req openapi.CompanyProfilesGetCompanyProfileRequestObject) (openapi.CompanyProfilesGetCompanyProfileResponseObject, error) {
	return s.companyProfile.GetProfile(ctx, req)
}

func (s *StrictServer) CompanyProfilesUpdateCompanyProfile(ctx context.Context, req openapi.CompanyProfilesUpdateCompanyProfileRequestObject) (openapi.CompanyProfilesUpdateCompanyProfileResponseObject, error) {
	return s.companyProfile.UpdateProfile(ctx, req)
}

func (s *StrictServer) CompanyProfilesUploadCompanyProfileImage(ctx context.Context, req openapi.CompanyProfilesUploadCompanyProfileImageRequestObject) (openapi.CompanyProfilesUploadCompanyProfileImageResponseObject, error) {
	return s.companyProfile.UploadImage(ctx, req)
}

func (s *StrictServer) CompanyProfilesDeleteCompanyProfileImage(ctx context.Context, req openapi.CompanyProfilesDeleteCompanyProfileImageRequestObject) (openapi.CompanyProfilesDeleteCompanyProfileImageResponseObject, error) {
	return s.companyProfile.DeleteImage(ctx, req)
}

// --- Company Teams ---

func (s *StrictServer) PublicTeamScoresGetPublicTeamScores(ctx context.Context, req openapi.PublicTeamScoresGetPublicTeamScoresRequestObject) (openapi.PublicTeamScoresGetPublicTeamScoresResponseObject, error) {
	return s.companyTeam.GetPublicTeamScores(ctx, req)
}

func (s *StrictServer) CompanyTeamsListTeams(ctx context.Context, req openapi.CompanyTeamsListTeamsRequestObject) (openapi.CompanyTeamsListTeamsResponseObject, error) {
	return s.companyTeam.ListTeams(ctx, req)
}

func (s *StrictServer) CompanyTeamsCreateTeam(ctx context.Context, req openapi.CompanyTeamsCreateTeamRequestObject) (openapi.CompanyTeamsCreateTeamResponseObject, error) {
	return s.companyTeam.CreateTeam(ctx, req)
}

func (s *StrictServer) CompanyTeamsGetTeam(ctx context.Context, req openapi.CompanyTeamsGetTeamRequestObject) (openapi.CompanyTeamsGetTeamResponseObject, error) {
	return s.companyTeam.GetTeam(ctx, req)
}

func (s *StrictServer) CompanyTeamsUpdateTeam(ctx context.Context, req openapi.CompanyTeamsUpdateTeamRequestObject) (openapi.CompanyTeamsUpdateTeamResponseObject, error) {
	return s.companyTeam.UpdateTeam(ctx, req)
}

func (s *StrictServer) CompanyTeamsDeleteTeam(ctx context.Context, req openapi.CompanyTeamsDeleteTeamRequestObject) (openapi.CompanyTeamsDeleteTeamResponseObject, error) {
	return s.companyTeam.DeleteTeam(ctx, req)
}

func (s *StrictServer) CompanyTeamsAddTeamMember(ctx context.Context, req openapi.CompanyTeamsAddTeamMemberRequestObject) (openapi.CompanyTeamsAddTeamMemberResponseObject, error) {
	return s.companyTeam.AddMember(ctx, req)
}

func (s *StrictServer) CompanyTeamsRemoveTeamMember(ctx context.Context, req openapi.CompanyTeamsRemoveTeamMemberRequestObject) (openapi.CompanyTeamsRemoveTeamMemberResponseObject, error) {
	return s.companyTeam.RemoveMember(ctx, req)
}

func (s *StrictServer) CompanyTeamsGetTeamScores(ctx context.Context, req openapi.CompanyTeamsGetTeamScoresRequestObject) (openapi.CompanyTeamsGetTeamScoresResponseObject, error) {
	return s.companyTeam.GetTeamScores(ctx, req)
}

func (s *StrictServer) CompanyTeamsSetAceMember(ctx context.Context, req openapi.CompanyTeamsSetAceMemberRequestObject) (openapi.CompanyTeamsSetAceMemberResponseObject, error) {
	return s.companyTeam.SetAceMember(ctx, req)
}

func (s *StrictServer) CompanyTeamsUnsetAceMember(ctx context.Context, req openapi.CompanyTeamsUnsetAceMemberRequestObject) (openapi.CompanyTeamsUnsetAceMemberResponseObject, error) {
	return s.companyTeam.UnsetAceMember(ctx, req)
}

// --- Talent Search ---

func (s *StrictServer) TalentSearchSearchTalents(ctx context.Context, req openapi.TalentSearchSearchTalentsRequestObject) (openapi.TalentSearchSearchTalentsResponseObject, error) {
	return s.talentSearch.Search(ctx, req)
}

func (s *StrictServer) TalentSearchDiagnosticSearchTalents(ctx context.Context, req openapi.TalentSearchDiagnosticSearchTalentsRequestObject) (openapi.TalentSearchDiagnosticSearchTalentsResponseObject, error) {
	return s.talentSearch.DiagnosticSearch(ctx, req)
}

func (s *StrictServer) TalentSearchCiDiagnosticSearchTalents(ctx context.Context, req openapi.TalentSearchCiDiagnosticSearchTalentsRequestObject) (openapi.TalentSearchCiDiagnosticSearchTalentsResponseObject, error) {
	return s.talentSearch.CIDiagnosticSearch(ctx, req)
}

func (s *StrictServer) TalentSearchIntegratedDiagnosticSearchTalents(ctx context.Context, req openapi.TalentSearchIntegratedDiagnosticSearchTalentsRequestObject) (openapi.TalentSearchIntegratedDiagnosticSearchTalentsResponseObject, error) {
	return s.talentSearch.IntegratedDiagnosticSearch(ctx, req)
}

// --- Saved Candidates ---

func (s *StrictServer) SavedCandidatesListSavedCandidates(ctx context.Context, req openapi.SavedCandidatesListSavedCandidatesRequestObject) (openapi.SavedCandidatesListSavedCandidatesResponseObject, error) {
	return s.savedCandidate.List(ctx, req)
}

func (s *StrictServer) SavedCandidatesCountSavedCandidates(ctx context.Context, req openapi.SavedCandidatesCountSavedCandidatesRequestObject) (openapi.SavedCandidatesCountSavedCandidatesResponseObject, error) {
	return s.savedCandidate.Count(ctx, req)
}

func (s *StrictServer) SavedCandidatesBulkCheckSaved(ctx context.Context, req openapi.SavedCandidatesBulkCheckSavedRequestObject) (openapi.SavedCandidatesBulkCheckSavedResponseObject, error) {
	return s.savedCandidate.BulkCheck(ctx, req)
}

func (s *StrictServer) SavedCandidatesSaveCandidate(ctx context.Context, req openapi.SavedCandidatesSaveCandidateRequestObject) (openapi.SavedCandidatesSaveCandidateResponseObject, error) {
	return s.savedCandidate.Save(ctx, req)
}

func (s *StrictServer) SavedCandidatesUnsaveCandidate(ctx context.Context, req openapi.SavedCandidatesUnsaveCandidateRequestObject) (openapi.SavedCandidatesUnsaveCandidateResponseObject, error) {
	return s.savedCandidate.Unsave(ctx, req)
}

func (s *StrictServer) SavedCandidatesIsCandidateSaved(ctx context.Context, req openapi.SavedCandidatesIsCandidateSavedRequestObject) (openapi.SavedCandidatesIsCandidateSavedResponseObject, error) {
	return s.savedCandidate.IsSaved(ctx, req)
}

// --- Company Scouts ---

func (s *StrictServer) CompanyScoutsSendScout(ctx context.Context, req openapi.CompanyScoutsSendScoutRequestObject) (openapi.CompanyScoutsSendScoutResponseObject, error) {
	return s.scout.Send(ctx, req)
}

func (s *StrictServer) CompanyScoutsListCompanyScouts(ctx context.Context, req openapi.CompanyScoutsListCompanyScoutsRequestObject) (openapi.CompanyScoutsListCompanyScoutsResponseObject, error) {
	return s.scout.List(ctx, req)
}

func (s *StrictServer) CompanyScoutsGetScoutCredits(ctx context.Context, req openapi.CompanyScoutsGetScoutCreditsRequestObject) (openapi.CompanyScoutsGetScoutCreditsResponseObject, error) {
	return s.scout.GetCredits(ctx, req)
}

func (s *StrictServer) CompanyScoutsGetScoutQuality(ctx context.Context, req openapi.CompanyScoutsGetScoutQualityRequestObject) (openapi.CompanyScoutsGetScoutQualityResponseObject, error) {
	return s.scout.GetQualityScore(ctx, req)
}

func (s *StrictServer) CompanyScoutsGetScoutDashboard(ctx context.Context, req openapi.CompanyScoutsGetScoutDashboardRequestObject) (openapi.CompanyScoutsGetScoutDashboardResponseObject, error) {
	return s.scout.GetDashboard(ctx, req)
}

func (s *StrictServer) CompanyScoutsGetCompanyScoutDetail(ctx context.Context, req openapi.CompanyScoutsGetCompanyScoutDetailRequestObject) (openapi.CompanyScoutsGetCompanyScoutDetailResponseObject, error) {
	return s.scout.GetDetail(ctx, req)
}

func (s *StrictServer) CompanyScoutsCompanyScoutReply(ctx context.Context, req openapi.CompanyScoutsCompanyScoutReplyRequestObject) (openapi.CompanyScoutsCompanyScoutReplyResponseObject, error) {
	return s.scout.Reply(ctx, req)
}

// --- Candidate Scouts ---

func (s *StrictServer) CandidateScoutsListCandidateScouts(ctx context.Context, req openapi.CandidateScoutsListCandidateScoutsRequestObject) (openapi.CandidateScoutsListCandidateScoutsResponseObject, error) {
	return s.candidateScout.List(ctx, req)
}

func (s *StrictServer) CandidateScoutsCountCandidateUnreadScouts(ctx context.Context, req openapi.CandidateScoutsCountCandidateUnreadScoutsRequestObject) (openapi.CandidateScoutsCountCandidateUnreadScoutsResponseObject, error) {
	return s.candidateScout.CountUnread(ctx, req)
}

func (s *StrictServer) CandidateScoutsGetCandidateScoutDetail(ctx context.Context, req openapi.CandidateScoutsGetCandidateScoutDetailRequestObject) (openapi.CandidateScoutsGetCandidateScoutDetailResponseObject, error) {
	return s.candidateScout.GetDetail(ctx, req)
}

func (s *StrictServer) CandidateScoutsRespondToScout(ctx context.Context, req openapi.CandidateScoutsRespondToScoutRequestObject) (openapi.CandidateScoutsRespondToScoutResponseObject, error) {
	return s.candidateScout.Respond(ctx, req)
}

func (s *StrictServer) CandidateScoutsCandidateScoutReply(ctx context.Context, req openapi.CandidateScoutsCandidateScoutReplyRequestObject) (openapi.CandidateScoutsCandidateScoutReplyResponseObject, error) {
	return s.candidateScout.Reply(ctx, req)
}

func (s *StrictServer) CandidateScoutsBulkDeclineScouts(ctx context.Context, req openapi.CandidateScoutsBulkDeclineScoutsRequestObject) (openapi.CandidateScoutsBulkDeclineScoutsResponseObject, error) {
	return s.candidateScout.BulkDecline(ctx, req)
}

func (s *StrictServer) CandidateScoutsBulkRespondScouts(ctx context.Context, req openapi.CandidateScoutsBulkRespondScoutsRequestObject) (openapi.CandidateScoutsBulkRespondScoutsResponseObject, error) {
	return s.candidateScout.BulkRespond(ctx, req)
}

// --- Scout Settings ---

func (s *StrictServer) ScoutSettingsGetScoutSettings(ctx context.Context, req openapi.ScoutSettingsGetScoutSettingsRequestObject) (openapi.ScoutSettingsGetScoutSettingsResponseObject, error) {
	return s.scoutSettings.Get(ctx, req)
}

func (s *StrictServer) ScoutSettingsUpdateScoutSettings(ctx context.Context, req openapi.ScoutSettingsUpdateScoutSettingsRequestObject) (openapi.ScoutSettingsUpdateScoutSettingsResponseObject, error) {
	return s.scoutSettings.Update(ctx, req)
}

// --- Scout Templates ---

func (s *StrictServer) ScoutTemplatesCreateScoutTemplate(ctx context.Context, req openapi.ScoutTemplatesCreateScoutTemplateRequestObject) (openapi.ScoutTemplatesCreateScoutTemplateResponseObject, error) {
	return s.scoutTemplate.Create(ctx, req)
}

func (s *StrictServer) ScoutTemplatesListScoutTemplates(ctx context.Context, req openapi.ScoutTemplatesListScoutTemplatesRequestObject) (openapi.ScoutTemplatesListScoutTemplatesResponseObject, error) {
	return s.scoutTemplate.List(ctx, req)
}

func (s *StrictServer) ScoutTemplatesGetScoutTemplate(ctx context.Context, req openapi.ScoutTemplatesGetScoutTemplateRequestObject) (openapi.ScoutTemplatesGetScoutTemplateResponseObject, error) {
	return s.scoutTemplate.Get(ctx, req)
}

func (s *StrictServer) ScoutTemplatesUpdateScoutTemplate(ctx context.Context, req openapi.ScoutTemplatesUpdateScoutTemplateRequestObject) (openapi.ScoutTemplatesUpdateScoutTemplateResponseObject, error) {
	return s.scoutTemplate.Update(ctx, req)
}

func (s *StrictServer) ScoutTemplatesDeleteScoutTemplate(ctx context.Context, req openapi.ScoutTemplatesDeleteScoutTemplateRequestObject) (openapi.ScoutTemplatesDeleteScoutTemplateResponseObject, error) {
	return s.scoutTemplate.Delete(ctx, req)
}

// --- Job Postings（企業） ---

func (s *StrictServer) CompanyJobPostingsCreateJobPosting(ctx context.Context, req openapi.CompanyJobPostingsCreateJobPostingRequestObject) (openapi.CompanyJobPostingsCreateJobPostingResponseObject, error) {
	return s.jobPosting.Create(ctx, req)
}

func (s *StrictServer) CompanyJobPostingsListCompanyJobPostings(ctx context.Context, req openapi.CompanyJobPostingsListCompanyJobPostingsRequestObject) (openapi.CompanyJobPostingsListCompanyJobPostingsResponseObject, error) {
	return s.jobPosting.List(ctx, req)
}

func (s *StrictServer) CompanyJobPostingsGetCompanyJobPosting(ctx context.Context, req openapi.CompanyJobPostingsGetCompanyJobPostingRequestObject) (openapi.CompanyJobPostingsGetCompanyJobPostingResponseObject, error) {
	return s.jobPosting.Get(ctx, req)
}

func (s *StrictServer) CompanyJobPostingsUpdateJobPosting(ctx context.Context, req openapi.CompanyJobPostingsUpdateJobPostingRequestObject) (openapi.CompanyJobPostingsUpdateJobPostingResponseObject, error) {
	return s.jobPosting.Update(ctx, req)
}

func (s *StrictServer) CompanyJobPostingsDeleteJobPosting(ctx context.Context, req openapi.CompanyJobPostingsDeleteJobPostingRequestObject) (openapi.CompanyJobPostingsDeleteJobPostingResponseObject, error) {
	return s.jobPosting.Delete(ctx, req)
}

func (s *StrictServer) CompanyJobPostingsUploadTeamMemberPhoto(ctx context.Context, req openapi.CompanyJobPostingsUploadTeamMemberPhotoRequestObject) (openapi.CompanyJobPostingsUploadTeamMemberPhotoResponseObject, error) {
	return s.jobPosting.UploadTeamMemberPhoto(ctx, req)
}

func (s *StrictServer) CompanyJobPostingsUploadGalleryImage(ctx context.Context, req openapi.CompanyJobPostingsUploadGalleryImageRequestObject) (openapi.CompanyJobPostingsUploadGalleryImageResponseObject, error) {
	return s.jobPosting.UploadGalleryImage(ctx, req)
}

func (s *StrictServer) CompanyJobPostingsUploadJobCoverImage(ctx context.Context, req openapi.CompanyJobPostingsUploadJobCoverImageRequestObject) (openapi.CompanyJobPostingsUploadJobCoverImageResponseObject, error) {
	return s.jobPosting.UploadCoverImage(ctx, req)
}

// --- Job Postings（公開） ---

func (s *StrictServer) PublicJobPostingsListPublicJobPostings(ctx context.Context, req openapi.PublicJobPostingsListPublicJobPostingsRequestObject) (openapi.PublicJobPostingsListPublicJobPostingsResponseObject, error) {
	return s.jobPosting.ListPublic(ctx, req)
}

func (s *StrictServer) PublicJobPostingsGetPublicJobPosting(ctx context.Context, req openapi.PublicJobPostingsGetPublicJobPostingRequestObject) (openapi.PublicJobPostingsGetPublicJobPostingResponseObject, error) {
	return s.jobPosting.GetPublic(ctx, req)
}

// --- Job Applications（候補者） ---

func (s *StrictServer) CandidateApplicationsApplyToJob(ctx context.Context, req openapi.CandidateApplicationsApplyToJobRequestObject) (openapi.CandidateApplicationsApplyToJobResponseObject, error) {
	return s.jobApplication.Apply(ctx, req)
}

func (s *StrictServer) CandidateApplicationsListCandidateApplications(ctx context.Context, req openapi.CandidateApplicationsListCandidateApplicationsRequestObject) (openapi.CandidateApplicationsListCandidateApplicationsResponseObject, error) {
	return s.jobApplication.ListByCandidate(ctx, req)
}

func (s *StrictServer) CandidateApplicationsCheckApplied(ctx context.Context, req openapi.CandidateApplicationsCheckAppliedRequestObject) (openapi.CandidateApplicationsCheckAppliedResponseObject, error) {
	return s.jobApplication.CheckApplied(ctx, req)
}

func (s *StrictServer) CandidateApplicationsWithdrawApplication(ctx context.Context, req openapi.CandidateApplicationsWithdrawApplicationRequestObject) (openapi.CandidateApplicationsWithdrawApplicationResponseObject, error) {
	return s.jobApplication.Withdraw(ctx, req)
}

// --- Job Applications（企業） ---

func (s *StrictServer) CompanyApplicationsListCompanyApplications(ctx context.Context, req openapi.CompanyApplicationsListCompanyApplicationsRequestObject) (openapi.CompanyApplicationsListCompanyApplicationsResponseObject, error) {
	return s.jobApplication.ListByCompany(ctx, req)
}

func (s *StrictServer) CompanyApplicationsGetApplication(ctx context.Context, req openapi.CompanyApplicationsGetApplicationRequestObject) (openapi.CompanyApplicationsGetApplicationResponseObject, error) {
	return s.jobApplication.GetByID(ctx, req)
}

func (s *StrictServer) CompanyApplicationsUpdateApplicationStatus(ctx context.Context, req openapi.CompanyApplicationsUpdateApplicationStatusRequestObject) (openapi.CompanyApplicationsUpdateApplicationStatusResponseObject, error) {
	return s.jobApplication.UpdateStatus(ctx, req)
}

// --- Messaging（候補者） ---

func (s *StrictServer) CandidateMessagingStartCandidateConversation(ctx context.Context, req openapi.CandidateMessagingStartCandidateConversationRequestObject) (openapi.CandidateMessagingStartCandidateConversationResponseObject, error) {
	return s.messaging.StartCandidateConversation(ctx, req)
}

func (s *StrictServer) CandidateMessagingListCandidateConversations(ctx context.Context, req openapi.CandidateMessagingListCandidateConversationsRequestObject) (openapi.CandidateMessagingListCandidateConversationsResponseObject, error) {
	return s.messaging.ListConversationsByCandidate(ctx, req)
}

func (s *StrictServer) CandidateMessagingGetCandidateConversation(ctx context.Context, req openapi.CandidateMessagingGetCandidateConversationRequestObject) (openapi.CandidateMessagingGetCandidateConversationResponseObject, error) {
	return s.messaging.GetConversationAsCandidate(ctx, req)
}

func (s *StrictServer) CandidateMessagingListCandidateMessages(ctx context.Context, req openapi.CandidateMessagingListCandidateMessagesRequestObject) (openapi.CandidateMessagingListCandidateMessagesResponseObject, error) {
	return s.messaging.ListMessagesAsCandidate(ctx, req)
}

func (s *StrictServer) CandidateMessagingSendCandidateMessage(ctx context.Context, req openapi.CandidateMessagingSendCandidateMessageRequestObject) (openapi.CandidateMessagingSendCandidateMessageResponseObject, error) {
	return s.messaging.SendMessageAsCandidate(ctx, req)
}

func (s *StrictServer) CandidateMessagingMarkCandidateConversationRead(ctx context.Context, req openapi.CandidateMessagingMarkCandidateConversationReadRequestObject) (openapi.CandidateMessagingMarkCandidateConversationReadResponseObject, error) {
	return s.messaging.MarkReadAsCandidate(ctx, req)
}

func (s *StrictServer) CandidateMessagingCountCandidateUnreadMessages(ctx context.Context, req openapi.CandidateMessagingCountCandidateUnreadMessagesRequestObject) (openapi.CandidateMessagingCountCandidateUnreadMessagesResponseObject, error) {
	return s.messaging.CountUnreadByCandidate(ctx, req)
}

// --- Messaging（企業） ---

func (s *StrictServer) CompanyMessagingStartCompanyConversation(ctx context.Context, req openapi.CompanyMessagingStartCompanyConversationRequestObject) (openapi.CompanyMessagingStartCompanyConversationResponseObject, error) {
	return s.messaging.StartConversation(ctx, req)
}

func (s *StrictServer) CompanyMessagingListCompanyConversations(ctx context.Context, req openapi.CompanyMessagingListCompanyConversationsRequestObject) (openapi.CompanyMessagingListCompanyConversationsResponseObject, error) {
	return s.messaging.ListConversationsByCompany(ctx, req)
}

func (s *StrictServer) CompanyMessagingGetCompanyConversation(ctx context.Context, req openapi.CompanyMessagingGetCompanyConversationRequestObject) (openapi.CompanyMessagingGetCompanyConversationResponseObject, error) {
	return s.messaging.GetConversationAsCompany(ctx, req)
}

func (s *StrictServer) CompanyMessagingListCompanyMessages(ctx context.Context, req openapi.CompanyMessagingListCompanyMessagesRequestObject) (openapi.CompanyMessagingListCompanyMessagesResponseObject, error) {
	return s.messaging.ListMessagesAsCompany(ctx, req)
}

func (s *StrictServer) CompanyMessagingSendCompanyMessage(ctx context.Context, req openapi.CompanyMessagingSendCompanyMessageRequestObject) (openapi.CompanyMessagingSendCompanyMessageResponseObject, error) {
	return s.messaging.SendMessageAsCompany(ctx, req)
}

func (s *StrictServer) CompanyMessagingMarkCompanyConversationRead(ctx context.Context, req openapi.CompanyMessagingMarkCompanyConversationReadRequestObject) (openapi.CompanyMessagingMarkCompanyConversationReadResponseObject, error) {
	return s.messaging.MarkReadAsCompany(ctx, req)
}

func (s *StrictServer) CompanyMessagingCountCompanyUnreadMessages(ctx context.Context, req openapi.CompanyMessagingCountCompanyUnreadMessagesRequestObject) (openapi.CompanyMessagingCountCompanyUnreadMessagesResponseObject, error) {
	return s.messaging.CountUnreadByCompany(ctx, req)
}

// --- Notifications（ユーザー） ---

func (s *StrictServer) UserNotificationsListUserNotifications(ctx context.Context, req openapi.UserNotificationsListUserNotificationsRequestObject) (openapi.UserNotificationsListUserNotificationsResponseObject, error) {
	return s.notification.ListByUser(ctx, req)
}

func (s *StrictServer) UserNotificationsCountUserUnreadNotifications(ctx context.Context, req openapi.UserNotificationsCountUserUnreadNotificationsRequestObject) (openapi.UserNotificationsCountUserUnreadNotificationsResponseObject, error) {
	return s.notification.CountUnreadByUser(ctx, req)
}

func (s *StrictServer) UserNotificationsMarkUserNotificationRead(ctx context.Context, req openapi.UserNotificationsMarkUserNotificationReadRequestObject) (openapi.UserNotificationsMarkUserNotificationReadResponseObject, error) {
	return s.notification.MarkAsReadByUser(ctx, req)
}

func (s *StrictServer) UserNotificationsMarkAllUserNotificationsRead(ctx context.Context, req openapi.UserNotificationsMarkAllUserNotificationsReadRequestObject) (openapi.UserNotificationsMarkAllUserNotificationsReadResponseObject, error) {
	return s.notification.MarkAllAsReadByUser(ctx, req)
}

// --- Notifications（企業） ---

func (s *StrictServer) CompanyNotificationsListCompanyNotifications(ctx context.Context, req openapi.CompanyNotificationsListCompanyNotificationsRequestObject) (openapi.CompanyNotificationsListCompanyNotificationsResponseObject, error) {
	return s.notification.ListByCompany(ctx, req)
}

func (s *StrictServer) CompanyNotificationsCountCompanyUnreadNotifications(ctx context.Context, req openapi.CompanyNotificationsCountCompanyUnreadNotificationsRequestObject) (openapi.CompanyNotificationsCountCompanyUnreadNotificationsResponseObject, error) {
	return s.notification.CountUnreadByCompany(ctx, req)
}

func (s *StrictServer) CompanyNotificationsMarkCompanyNotificationRead(ctx context.Context, req openapi.CompanyNotificationsMarkCompanyNotificationReadRequestObject) (openapi.CompanyNotificationsMarkCompanyNotificationReadResponseObject, error) {
	return s.notification.MarkAsReadByCompany(ctx, req)
}

func (s *StrictServer) CompanyNotificationsMarkAllCompanyNotificationsRead(ctx context.Context, req openapi.CompanyNotificationsMarkAllCompanyNotificationsReadRequestObject) (openapi.CompanyNotificationsMarkAllCompanyNotificationsReadResponseObject, error) {
	return s.notification.MarkAllAsReadByCompany(ctx, req)
}

// --- Interviews（企業） ---

func (s *StrictServer) CompanyInterviewsProposeInterview(ctx context.Context, req openapi.CompanyInterviewsProposeInterviewRequestObject) (openapi.CompanyInterviewsProposeInterviewResponseObject, error) {
	return s.interview.Propose(ctx, req)
}

func (s *StrictServer) CompanyInterviewsGetPendingProposal(ctx context.Context, req openapi.CompanyInterviewsGetPendingProposalRequestObject) (openapi.CompanyInterviewsGetPendingProposalResponseObject, error) {
	return s.interview.GetPendingProposal(ctx, req)
}

func (s *StrictServer) CompanyInterviewsListCompanyInterviews(ctx context.Context, req openapi.CompanyInterviewsListCompanyInterviewsRequestObject) (openapi.CompanyInterviewsListCompanyInterviewsResponseObject, error) {
	return s.interview.ListByCompany(ctx, req)
}

func (s *StrictServer) CompanyInterviewsCancelCompanyInterview(ctx context.Context, req openapi.CompanyInterviewsCancelCompanyInterviewRequestObject) (openapi.CompanyInterviewsCancelCompanyInterviewResponseObject, error) {
	return s.interview.CancelAsCompany(ctx, req)
}

// --- Interviews（候補者） ---

func (s *StrictServer) CandidateInterviewsListCandidateInterviews(ctx context.Context, req openapi.CandidateInterviewsListCandidateInterviewsRequestObject) (openapi.CandidateInterviewsListCandidateInterviewsResponseObject, error) {
	return s.interview.ListByCandidate(ctx, req)
}

func (s *StrictServer) CandidateInterviewsSelectInterviewSlot(ctx context.Context, req openapi.CandidateInterviewsSelectInterviewSlotRequestObject) (openapi.CandidateInterviewsSelectInterviewSlotResponseObject, error) {
	return s.interview.SelectSlot(ctx, req)
}

func (s *StrictServer) CandidateInterviewsGetProposalSlots(ctx context.Context, req openapi.CandidateInterviewsGetProposalSlotsRequestObject) (openapi.CandidateInterviewsGetProposalSlotsResponseObject, error) {
	return s.interview.GetProposalSlots(ctx, req)
}

func (s *StrictServer) CandidateInterviewsCancelCandidateInterview(ctx context.Context, req openapi.CandidateInterviewsCancelCandidateInterviewRequestObject) (openapi.CandidateInterviewsCancelCandidateInterviewResponseObject, error) {
	return s.interview.CancelAsCandidate(ctx, req)
}

// --- Admin: 管理者 ---

func (s *StrictServer) AdminListAdmins(ctx context.Context, req openapi.AdminListAdminsRequestObject) (openapi.AdminListAdminsResponseObject, error) {
	return s.adminAdmin.List(ctx, req)
}

func (s *StrictServer) AdminCreateAdmin(ctx context.Context, req openapi.AdminCreateAdminRequestObject) (openapi.AdminCreateAdminResponseObject, error) {
	return s.adminAdmin.Create(ctx, req)
}

func (s *StrictServer) AdminIssueAdminApiKey(ctx context.Context, req openapi.AdminIssueAdminApiKeyRequestObject) (openapi.AdminIssueAdminApiKeyResponseObject, error) {
	return s.adminAdmin.IssueKey(ctx, req)
}

func (s *StrictServer) AdminDeleteAdmin(ctx context.Context, req openapi.AdminDeleteAdminRequestObject) (openapi.AdminDeleteAdminResponseObject, error) {
	return s.adminAdmin.Delete(ctx, req)
}

// --- Admin: ユーザー ---

func (s *StrictServer) AdminListUsers(ctx context.Context, req openapi.AdminListUsersRequestObject) (openapi.AdminListUsersResponseObject, error) {
	return s.adminUser.List(ctx, req)
}

func (s *StrictServer) AdminDeleteUser(ctx context.Context, req openapi.AdminDeleteUserRequestObject) (openapi.AdminDeleteUserResponseObject, error) {
	return s.adminUser.Delete(ctx, req)
}

func (s *StrictServer) AdminBypassLoginAsUser(ctx context.Context, req openapi.AdminBypassLoginAsUserRequestObject) (openapi.AdminBypassLoginAsUserResponseObject, error) {
	return s.adminUser.BypassLogin(ctx, req)
}

// --- Admin: 企業 ---

func (s *StrictServer) AdminListCompanies(ctx context.Context, req openapi.AdminListCompaniesRequestObject) (openapi.AdminListCompaniesResponseObject, error) {
	return s.adminCompany.List(ctx, req)
}

func (s *StrictServer) AdminUpdateCompanyStatus(ctx context.Context, req openapi.AdminUpdateCompanyStatusRequestObject) (openapi.AdminUpdateCompanyStatusResponseObject, error) {
	return s.adminCompany.UpdateStatus(ctx, req)
}

func (s *StrictServer) AdminBypassLoginAsCompany(ctx context.Context, req openapi.AdminBypassLoginAsCompanyRequestObject) (openapi.AdminBypassLoginAsCompanyResponseObject, error) {
	return s.adminCompany.BypassLogin(ctx, req)
}

// --- Admin: WV レポート ---

func (s *StrictServer) AdminListPendingWvSessions(ctx context.Context, req openapi.AdminListPendingWvSessionsRequestObject) (openapi.AdminListPendingWvSessionsResponseObject, error) {
	return s.adminReport.ListPending(ctx, req)
}

func (s *StrictServer) AdminListWvReports(ctx context.Context, req openapi.AdminListWvReportsRequestObject) (openapi.AdminListWvReportsResponseObject, error) {
	return s.adminReport.ListReports(ctx, req)
}

func (s *StrictServer) AdminSaveWvReport(ctx context.Context, req openapi.AdminSaveWvReportRequestObject) (openapi.AdminSaveWvReportResponseObject, error) {
	return s.adminReport.SaveReport(ctx, req)
}

func (s *StrictServer) AdminGetWvReport(ctx context.Context, req openapi.AdminGetWvReportRequestObject) (openapi.AdminGetWvReportResponseObject, error) {
	return s.adminReport.GetReport(ctx, req)
}

func (s *StrictServer) AdminGetWvSessionScores(ctx context.Context, req openapi.AdminGetWvSessionScoresRequestObject) (openapi.AdminGetWvSessionScoresResponseObject, error) {
	return s.adminReport.GetSessionScores(ctx, req)
}

func (s *StrictServer) AdminGetWvPrompt(ctx context.Context, req openapi.AdminGetWvPromptRequestObject) (openapi.AdminGetWvPromptResponseObject, error) {
	return s.adminReport.GetPrompt(ctx, req)
}

func (s *StrictServer) AdminResetWvReportViewed(ctx context.Context, req openapi.AdminResetWvReportViewedRequestObject) (openapi.AdminResetWvReportViewedResponseObject, error) {
	return s.adminReport.ResetViewed(ctx, req)
}

func (s *StrictServer) WorkValuesWvGetAiReport(ctx context.Context, req openapi.WorkValuesWvGetAiReportRequestObject) (openapi.WorkValuesWvGetAiReportResponseObject, error) {
	return s.adminReport.GetReportAsUser(ctx, req)
}

// --- Admin: CI レポート ---

func (s *StrictServer) AdminListPendingCiSessions(ctx context.Context, req openapi.AdminListPendingCiSessionsRequestObject) (openapi.AdminListPendingCiSessionsResponseObject, error) {
	return s.adminCIReport.ListPending(ctx, req)
}

func (s *StrictServer) AdminListCiReports(ctx context.Context, req openapi.AdminListCiReportsRequestObject) (openapi.AdminListCiReportsResponseObject, error) {
	return s.adminCIReport.ListReports(ctx, req)
}

func (s *StrictServer) AdminSaveCiReport(ctx context.Context, req openapi.AdminSaveCiReportRequestObject) (openapi.AdminSaveCiReportResponseObject, error) {
	return s.adminCIReport.SaveReport(ctx, req)
}

func (s *StrictServer) AdminGetCiReport(ctx context.Context, req openapi.AdminGetCiReportRequestObject) (openapi.AdminGetCiReportResponseObject, error) {
	return s.adminCIReport.GetReport(ctx, req)
}

func (s *StrictServer) AdminGetCiPrompt(ctx context.Context, req openapi.AdminGetCiPromptRequestObject) (openapi.AdminGetCiPromptResponseObject, error) {
	return s.adminCIReport.GetPrompt(ctx, req)
}

func (s *StrictServer) AdminResetCiReportViewed(ctx context.Context, req openapi.AdminResetCiReportViewedRequestObject) (openapi.AdminResetCiReportViewedResponseObject, error) {
	return s.adminCIReport.ResetViewed(ctx, req)
}

func (s *StrictServer) CareerInterestCiGetAiReport(ctx context.Context, req openapi.CareerInterestCiGetAiReportRequestObject) (openapi.CareerInterestCiGetAiReportResponseObject, error) {
	return s.adminCIReport.GetReportAsUser(ctx, req)
}

// --- Admin: 統合レポート ---

func (s *StrictServer) AdminListPendingIntegratedRequests(ctx context.Context, req openapi.AdminListPendingIntegratedRequestsRequestObject) (openapi.AdminListPendingIntegratedRequestsResponseObject, error) {
	return s.adminIntReport.ListPending(ctx, req)
}

func (s *StrictServer) AdminListIntegratedReports(ctx context.Context, req openapi.AdminListIntegratedReportsRequestObject) (openapi.AdminListIntegratedReportsResponseObject, error) {
	return s.adminIntReport.ListReports(ctx, req)
}

func (s *StrictServer) AdminSaveIntegratedReport(ctx context.Context, req openapi.AdminSaveIntegratedReportRequestObject) (openapi.AdminSaveIntegratedReportResponseObject, error) {
	return s.adminIntReport.SaveReport(ctx, req)
}

func (s *StrictServer) AdminGetIntegratedReportAsAdmin(ctx context.Context, req openapi.AdminGetIntegratedReportAsAdminRequestObject) (openapi.AdminGetIntegratedReportAsAdminResponseObject, error) {
	return s.adminIntReport.GetReportAsAdmin(ctx, req)
}

func (s *StrictServer) AdminGetIntegratedPrompt(ctx context.Context, req openapi.AdminGetIntegratedPromptRequestObject) (openapi.AdminGetIntegratedPromptResponseObject, error) {
	return s.adminIntReport.GetPrompt(ctx, req)
}

func (s *StrictServer) AdminResetIntegratedReportViewed(ctx context.Context, req openapi.AdminResetIntegratedReportViewedRequestObject) (openapi.AdminResetIntegratedReportViewedResponseObject, error) {
	return s.adminIntReport.ResetViewed(ctx, req)
}

// --- 統合レポート（user-facing） ---

func (s *StrictServer) IntegratedReportCreateIntegratedReportRequest(ctx context.Context, req openapi.IntegratedReportCreateIntegratedReportRequestRequestObject) (openapi.IntegratedReportCreateIntegratedReportRequestResponseObject, error) {
	return s.adminIntReport.CreateRequest(ctx, req)
}

func (s *StrictServer) IntegratedReportGetMyIntegratedReport(ctx context.Context, req openapi.IntegratedReportGetMyIntegratedReportRequestObject) (openapi.IntegratedReportGetMyIntegratedReportResponseObject, error) {
	return s.adminIntReport.GetReportByUser(ctx, req)
}

func (s *StrictServer) IntegratedReportGetIntegratedReportStatus(ctx context.Context, req openapi.IntegratedReportGetIntegratedReportStatusRequestObject) (openapi.IntegratedReportGetIntegratedReportStatusResponseObject, error) {
	return s.adminIntReport.GetRequestStatus(ctx, req)
}

func (s *StrictServer) IntegratedReportGetIntegratedReport(ctx context.Context, req openapi.IntegratedReportGetIntegratedReportRequestObject) (openapi.IntegratedReportGetIntegratedReportResponseObject, error) {
	return s.adminIntReport.GetReportAsUser(ctx, req)
}

func (s *StrictServer) IntegratedReportGetLatestIntegratedRequest(ctx context.Context, req openapi.IntegratedReportGetLatestIntegratedRequestRequestObject) (openapi.IntegratedReportGetLatestIntegratedRequestResponseObject, error) {
	return s.adminIntReport.GetLatestRequest(ctx, req)
}
