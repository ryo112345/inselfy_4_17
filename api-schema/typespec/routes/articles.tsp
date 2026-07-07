import "@typespec/http";
import "@typespec/openapi3";
import "../models/article.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/articles")
@tag("Articles")
interface Articles {
  /** 記事一覧 */
  @get
  @summary("List published articles")
  listArticles(
    /** 取得件数 */
    @query limit?: int32,

    /** オフセット */
    @query offset?: int32,
  ): ArticleListResponse | BadRequestError;

  /** 自分の記事一覧（要ログイン） */
  @get
  @route("/mine")
  @summary("List articles authored by the authenticated user")
  @useAuth(Models.CandidateAuth)
  listMyArticles(
    @query limit?: int32,
    @query offset?: int32,
  ): ArticleListResponse | AuthedErrors;

  /** 記事画像アップロード（要ログイン） */
  @post
  @route("/upload-image")
  @summary("Upload an article image")
  @useAuth(Models.CandidateAuth)
  uploadArticleImage(
    @header contentType: "multipart/form-data",
    @multipartBody body: {
      file: HttpPart<bytes>;
    },
  ): UploadUrlResponse | AuthedErrors;

  /** 記事作成（要ログイン） */
  @post
  @summary("Create an article as a user")
  @useAuth(Models.CandidateAuth)
  createArticle(
    @body request: CreateArticleRequest,
  ): {
    @statusCode statusCode: 201;
    @body article: ArticleResponse;
  } | AuthedErrors;

  /** 記事取得 */
  @get
  @route("/{articleId}")
  @summary("Get an article")
  @useAuth(Models.CandidateAuth | NoAuth)
  getArticle(
    @path articleId: Uuid,
  ): ArticleResponse | NotFoundErrors;

  /** 記事更新（要ログイン・著者のみ） */
  @put
  @route("/{articleId}")
  @summary("Update an article as a user")
  @useAuth(Models.CandidateAuth)
  updateArticle(
    @path articleId: Uuid,
    @body request: UpdateArticleRequest,
  ): ArticleResponse | AuthedForbiddenErrors;

  /** 記事削除（要ログイン・著者のみ） */
  @delete
  @route("/{articleId}")
  @summary("Delete an article as a user")
  @useAuth(Models.CandidateAuth)
  deleteArticle(
    @path articleId: Uuid,
  ): {
    @statusCode statusCode: 204;
  } | AuthedForbiddenErrors;

  /** 記事公開（要ログイン・著者のみ） */
  @post
  @route("/{articleId}/publish")
  @summary("Publish an article as a user")
  @useAuth(Models.CandidateAuth)
  publishArticle(
    @path articleId: Uuid,
  ): ArticleResponse | AuthedForbiddenErrors;

  /** 有料記事のチェックアウト開始（要ログイン） */
  @post
  @route("/{articleId}/checkout")
  @summary("Create a Stripe checkout session for a paid article")
  @useAuth(Models.CandidateAuth)
  createArticleCheckout(
    @path articleId: Uuid,
  ): CheckoutSessionResponse | AuthedNotFoundErrors;
}

@route("/api/company/articles")
@tag("Articles")
@useAuth(Models.CompanyAuth)
interface CompanyArticles {
  /** 記事作成（企業認証） */
  @post
  @summary("Create an article as a company")
  createCompanyArticle(
    @body request: CreateArticleRequest,
  ): {
    @statusCode statusCode: 201;
    @body article: ArticleResponse;
  } | AuthedErrors;

  /** 記事更新（企業認証・著者のみ） */
  @put
  @route("/{articleId}")
  @summary("Update an article as a company")
  updateCompanyArticle(
    @path articleId: Uuid,
    @body request: UpdateArticleRequest,
  ): ArticleResponse | AuthedForbiddenErrors;

  /** 記事削除（企業認証・著者のみ） */
  @delete
  @route("/{articleId}")
  @summary("Delete an article as a company")
  deleteCompanyArticle(
    @path articleId: Uuid,
  ): {
    @statusCode statusCode: 204;
  } | AuthedForbiddenErrors;

  /** 記事公開（企業認証・著者のみ） */
  @post
  @route("/{articleId}/publish")
  @summary("Publish an article as a company")
  publishCompanyArticle(
    @path articleId: Uuid,
  ): ArticleResponse | AuthedForbiddenErrors;
}
