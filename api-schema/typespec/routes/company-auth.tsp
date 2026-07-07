import "@typespec/http";
import "@typespec/openapi3";
import "../models/company-auth.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/company/auth")
@tag("CompanyAuth")
interface CompanyAuth {
  /** 企業アカウント登録 */
  @post
  @route("/register")
  @summary("Register a company account")
  companyRegister(
    @body request: CompanyRegisterRequest,
  ): {
    @statusCode statusCode: 201;
    @body company: CompanyResponse;
  } | BadRequestError | ConflictError | UnauthorizedError;

  /** 企業ログイン。成功時は HttpOnly cookie にトークンを設定し、企業情報を返す */
  @post
  @route("/login")
  @summary("Login as a company")
  companyLogin(
    @body request: CompanyLoginRequest,
  ): CompanyResponse | BadRequestError | UnauthorizedError;

  /** トークンリフレッシュ（company_refresh_token cookie 使用） */
  @post
  @route("/refresh")
  @summary("Refresh the company access token via cookie")
  companyRefreshToken(): CompanyResponse | UnauthorizedError;

  /** ログアウト（認証 cookie を削除） */
  @post
  @route("/logout")
  @summary("Logout the company and clear auth cookies")
  companyLogout(): {
    @statusCode statusCode: 204;
  };

  /** ログイン中の企業情報取得 */
  @get
  @route("/me")
  @summary("Get the authenticated company")
  @useAuth(Models.CompanyAuth)
  companyGetMe(): CompanyResponse | UnauthorizedError | NotFoundError;
}
