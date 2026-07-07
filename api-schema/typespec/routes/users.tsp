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
  ): UserResponse | NotFoundErrors;

  /** プロフィール更新（PATCH） */
  @patch
  @route("/{username}")
  @summary("Update a user profile")
  @useAuth(Models.CandidateAuth)
  updateUserProfile(
    @path username: string,
    @body request: UpdateUserProfileRequest,
  ): UserResponse | AuthedNotFoundErrors;

  /** ユーザーIDでユーザー取得 */
  @get
  @route("/id/{id}")
  @summary("Get a user by ID")
  getUserById(
    @path id: Uuid,
  ): UserResponse | NotFoundErrors;

  /** プロフィール画像アップロード（avatar / cover、要ログイン） */
  @post
  @route("/{username}/upload-image")
  @summary("Upload a user profile image")
  @useAuth(Models.CandidateAuth)
  uploadUserImage(
    @path username: string,
    @query type: "avatar" | "cover",
    @header contentType: "multipart/form-data",
    @multipartBody body: {
      file: HttpPart<bytes>;
    },
  ): UserImageUploadResponse | AuthedNotFoundErrors;
}
