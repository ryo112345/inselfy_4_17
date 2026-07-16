package controller

import (
	"context"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
)

// StrictServer implements the generated StrictServerInterface incrementally
// during the strict-server migration (docs/strict-server-migration.md Phase 3).
// The embedded interface satisfies the operations whose feature group has not
// migrated yet; those are still served by the echo router and never dispatched
// here, so the nil embed is unreachable. Once every group has migrated, the
// embed is removed and conformance becomes a compile-time check again.
//
// Controllers are installed by the wire_*.go of each migrated group through
// that group's Wire*Group setter before the server starts serving; the
// per-group setters keep "wire に代入し忘れた controller" a compile error
// instead of a nil dereference at request time.
type StrictServer struct {
	openapi.StrictServerInterface

	user         *UserController
	experience   *ExperienceController
	education    *EducationController
	skill        *SkillController
	follow       *FollowController
	similarUsers *SimilarUsersController

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
}

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
) {
	s.user = user
	s.experience = experience
	s.education = education
	s.skill = skill
	s.follow = follow
	s.similarUsers = similarUsers
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

// --- Users ---
// PATCH /api/users/{username} は raw JSON デコードのため strict を経由しない
// （UserController.UpdateProfileHTTP を wire_user.go が直接 mux に登録する）。

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
