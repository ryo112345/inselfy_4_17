import "@typespec/http";
import "@typespec/openapi3";
import "../models/user.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/users")
@tag("Users")
interface Users {
  /** ユーザー作成 */
  @post
  @summary("Create a new user")
  createUser(
    @body request: CreateUserRequest,
  ): {
    @statusCode statusCode: 201;
    @body user: UserResponse;
  } | BadRequestError | ConflictError;

  /** ユーザー名でユーザー取得 */
  @get
  @route("/{username}")
  @summary("Get a user by username")
  getUserByUsername(
    @path username: string,
  ): UserResponse | NotFoundError | BadRequestError;
}
