import "@typespec/http";
import "@typespec/openapi3";
import "../models/experience.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/users/{username}/experiences")
@tag("Experiences")
interface Experiences {
  /** 職歴一覧 */
  @get
  @summary("List experiences for a user")
  listExperiences(
    @path username: string,
  ): ExperienceListResponse | NotFoundError | BadRequestError;

  /** 職歴作成 */
  @post
  @summary("Create a new experience")
  createExperience(
    @path username: string,
    @body request: CreateExperienceRequest,
  ): {
    @statusCode statusCode: 201;
    @body experience: ExperienceResponse;
  } | BadRequestError | NotFoundError | ConflictError;

  /** 職歴更新 */
  @put
  @route("/{experienceId}")
  @summary("Update an experience")
  updateExperience(
    @path username: string,
    @path experienceId: string,
    @body request: UpdateExperienceRequest,
  ): ExperienceResponse | BadRequestError | NotFoundError | ForbiddenError;

  /** 職歴削除 */
  @delete
  @route("/{experienceId}")
  @summary("Delete an experience")
  deleteExperience(
    @path username: string,
    @path experienceId: string,
  ): {
    @statusCode statusCode: 204;
  } | NotFoundError | BadRequestError | ForbiddenError;
}
