import "@typespec/http";
import "@typespec/openapi3";
import "../models/skill.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/users/{username}/skills")
@tag("Skills")
interface Skills {
  /** スキル一覧 */
  @get
  @summary("List skills for a user")
  listSkills(
    @path username: string,
  ): SkillListResponse | NotFoundErrors;

  /** スキル追加（グローバルに無ければ作成） */
  @post
  @summary("Attach a skill to a user")
  @useAuth(Models.CandidateAuth)
  attachSkill(
    @path username: string,
    @body request: AttachSkillRequest,
  ): {
    @statusCode statusCode: 201;
    @body skill: SkillResponse;
  } | AuthedConflictErrors;

  /** スキル取り外し（名前で） */
  @delete
  @route("/{name}")
  @summary("Detach a skill by name")
  @useAuth(Models.CandidateAuth)
  detachSkill(
    @path username: string,
    @path name: string,
  ): {
    @statusCode statusCode: 204;
  } | AuthedNotFoundErrors;
}
