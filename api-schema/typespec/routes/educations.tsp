import "@typespec/http";
import "@typespec/openapi3";
import "../models/education.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/users/{username}/educations")
@tag("Educations")
interface Educations {
  /** 学歴一覧 */
  @get
  @summary("List educations for a user")
  listEducations(
    @path username: string,
  ): EducationListResponse | NotFoundErrors;

  /** 学歴作成 */
  @post
  @summary("Create a new education")
  @useAuth(Models.CandidateAuth)
  createEducation(
    @path username: string,
    @body request: CreateEducationRequest,
  ): {
    @statusCode statusCode: 201;
    @body education: EducationResponse;
  } | AuthedConflictErrors;

  /** 学歴更新 */
  @put
  @route("/{educationId}")
  @summary("Update an education")
  @useAuth(Models.CandidateAuth)
  updateEducation(
    @path username: string,
    @path educationId: Uuid,
    @body request: UpdateEducationRequest,
  ): EducationResponse | AuthedForbiddenErrors;

  /** 学歴削除 */
  @delete
  @route("/{educationId}")
  @summary("Delete an education")
  @useAuth(Models.CandidateAuth)
  deleteEducation(
    @path username: string,
    @path educationId: Uuid,
  ): {
    @statusCode statusCode: 204;
  } | AuthedForbiddenErrors;
}
