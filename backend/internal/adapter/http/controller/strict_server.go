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
