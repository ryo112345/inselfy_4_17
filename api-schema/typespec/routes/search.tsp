import "@typespec/http";
import "@typespec/openapi3";
import "../models/search.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/search")
@tag("Search")
interface Search {
  /** 横断検索（要ログイン）。各カテゴリの上位数件と総件数を返す */
  @get
  @summary("Search across users, articles, posts and jobs")
  @useAuth(Models.CandidateAuth)
  searchAll(
    /** 検索キーワード */
    @query @minLength(1) @maxLength(100) q: string,

    /** カテゴリごとの取得件数（デフォルト3、最大10） */
    @query limitPerType?: int32,
  ): SearchAllResponse | AuthedErrors;

  /** ユーザー検索（要ログイン） */
  @get
  @route("/users")
  @summary("Search users")
  @useAuth(Models.CandidateAuth)
  searchUsers(
    /** 検索キーワード */
    @query @minLength(1) @maxLength(100) q: string,

    /** 取得件数 */
    @query limit?: int32,

    /** オフセット */
    @query offset?: int32,
  ): SearchUserListResponse | AuthedErrors;

  /** 記事検索（要ログイン） */
  @get
  @route("/articles")
  @summary("Search articles")
  @useAuth(Models.CandidateAuth)
  searchArticles(
    /** 検索キーワード */
    @query @minLength(1) @maxLength(100) q: string,

    /** 取得件数 */
    @query limit?: int32,

    /** オフセット */
    @query offset?: int32,
  ): SearchArticleListResponse | AuthedErrors;

  /** 投稿検索（要ログイン） */
  @get
  @route("/posts")
  @summary("Search posts")
  @useAuth(Models.CandidateAuth)
  searchPosts(
    /** 検索キーワード */
    @query @minLength(1) @maxLength(100) q: string,

    /** 取得件数 */
    @query limit?: int32,

    /** オフセット */
    @query offset?: int32,
  ): SearchPostListResponse | AuthedErrors;

  /** 求人検索（要ログイン） */
  @get
  @route("/jobs")
  @summary("Search jobs")
  @useAuth(Models.CandidateAuth)
  searchJobs(
    /** 検索キーワード */
    @query @minLength(1) @maxLength(100) q: string,

    /** 取得件数 */
    @query limit?: int32,

    /** オフセット */
    @query offset?: int32,
  ): SearchJobListResponse | AuthedErrors;
}
