import "@typespec/http";
import "@typespec/openapi3";
import "../models/auth.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/auth")
@tag("Auth")
interface Auth {
  /** Google ログイン。成功時は HttpOnly cookie にトークンを設定し、ユーザー情報を返す */
  @post
  @route("/google")
  @summary("Login with a Google ID token")
  googleLogin(
    @body request: GoogleLoginRequest,
  ): AuthUserResponse | BadRequestError | UnauthorizedError;

  /** トークンリフレッシュ（refresh_token cookie 使用）。cookie を更新しユーザー情報を返す */
  @post
  @route("/refresh")
  @summary("Refresh the access token via cookie")
  refreshToken(): AuthUserResponse | UnauthorizedError;

  /** ログアウト（認証 cookie を削除） */
  @post
  @route("/logout")
  @summary("Logout and clear auth cookies")
  logout(): {
    @statusCode statusCode: 204;
  };

  /** ログイン中ユーザー情報取得 */
  @get
  @route("/me")
  @summary("Get the authenticated user")
  @useAuth(Models.CandidateAuth)
  getMe(): AuthUserResponse | UnauthorizedError | NotFoundError;
}
