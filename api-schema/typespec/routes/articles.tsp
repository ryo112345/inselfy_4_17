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
  listMyArticles(
    @query limit?: int32,
    @query offset?: int32,
  ): ArticleListResponse | BadRequestError;

  /** 記事画像アップロード（要ログイン） */
  @post
  @route("/upload-image")
  @summary("Upload an article image")
  uploadArticleImage(
    @header contentType: "multipart/form-data",
    @multipartBody body: {
      file: HttpPart<bytes>;
    },
  ): UploadUrlResponse | BadRequestError;

  /** 記事作成（要ログイン） */
  @post
  @summary("Create an article as a user")
  createArticle(
    @body request: CreateArticleRequest,
  ): {
    @statusCode statusCode: 201;
    @body article: ArticleResponse;
  } | BadRequestError;

  /** 記事取得 */
  @get
  @route("/{articleId}")
  @summary("Get an article")
  getArticle(
    @path articleId: string,
  ): ArticleResponse | NotFoundError | BadRequestError;

  /** 記事更新（要ログイン・著者のみ） */
  @put
  @route("/{articleId}")
  @summary("Update an article as a user")
  updateArticle(
    @path articleId: string,
    @body request: UpdateArticleRequest,
  ): ArticleResponse | BadRequestError | NotFoundError | ForbiddenError;

  /** 記事削除（要ログイン・著者のみ） */
  @delete
  @route("/{articleId}")
  @summary("Delete an article as a user")
  deleteArticle(
    @path articleId: string,
  ): {
    @statusCode statusCode: 204;
  } | NotFoundError | ForbiddenError | BadRequestError;

  /** 記事公開（要ログイン・著者のみ） */
  @post
  @route("/{articleId}/publish")
  @summary("Publish an article as a user")
  publishArticle(
    @path articleId: string,
  ): ArticleResponse | BadRequestError | NotFoundError | ForbiddenError;

  /** 有料記事のチェックアウト開始（要ログイン） */
  @post
  @route("/{articleId}/checkout")
  @summary("Create a Stripe checkout session for a paid article")
  createArticleCheckout(
    @path articleId: string,
  ): CheckoutSessionResponse | BadRequestError | NotFoundError;
}

@route("/api/company/articles")
@tag("Articles")
interface CompanyArticles {
  /** 記事作成（企業認証） */
  @post
  @summary("Create an article as a company")
  createCompanyArticle(
    @body request: CreateArticleRequest,
  ): {
    @statusCode statusCode: 201;
    @body article: ArticleResponse;
  } | BadRequestError;

  /** 記事更新（企業認証・著者のみ） */
  @put
  @route("/{articleId}")
  @summary("Update an article as a company")
  updateCompanyArticle(
    @path articleId: string,
    @body request: UpdateArticleRequest,
  ): ArticleResponse | BadRequestError | NotFoundError | ForbiddenError;

  /** 記事削除（企業認証・著者のみ） */
  @delete
  @route("/{articleId}")
  @summary("Delete an article as a company")
  deleteCompanyArticle(
    @path articleId: string,
  ): {
    @statusCode statusCode: 204;
  } | NotFoundError | ForbiddenError | BadRequestError;

  /** 記事公開（企業認証・著者のみ） */
  @post
  @route("/{articleId}/publish")
  @summary("Publish an article as a company")
  publishCompanyArticle(
    @path articleId: string,
  ): ArticleResponse | BadRequestError | NotFoundError | ForbiddenError;
}
