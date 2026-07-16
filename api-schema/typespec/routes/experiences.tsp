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
  ): ExperienceListResponse | NotFoundErrors;

  /** 職歴作成 */
  @post
  @summary("Create a new experience")
  @useAuth(Models.CandidateAuth)
  createExperience(
    @path username: string,
    @body request: CreateExperienceRequest,
  ): {
    @statusCode statusCode: 201;
    @body experience: ExperienceResponse;
  } | AuthedForbiddenConflictErrors;

  /** 職歴更新 */
  @put
  @route("/{experienceId}")
  @summary("Update an experience")
  @useAuth(Models.CandidateAuth)
  updateExperience(
    @path username: string,
    @path experienceId: Uuid,
    @body request: UpdateExperienceRequest,
  ): ExperienceResponse | AuthedForbiddenErrors;

  /** 職歴削除 */
  @delete
  @route("/{experienceId}")
  @summary("Delete an experience")
  @useAuth(Models.CandidateAuth)
  deleteExperience(
    @path username: string,
    @path experienceId: Uuid,
  ): {
    @statusCode statusCode: 204;
  } | AuthedForbiddenErrors;
}
