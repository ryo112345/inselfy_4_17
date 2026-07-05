import "@typespec/http";
import "@typespec/openapi3";
import "../models/company-team.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/companies/{id}/teams/scores")
@tag("CompanyTeams")
interface PublicTeamScores {
  /** 企業の公開チームスコア取得 */
  @get
  @summary("Get public team scores of a company")
  getPublicTeamScores(
    @path id: string,
  ): PublicTeamScoresResponse | NotFoundError | BadRequestError;
}

@route("/api/company/teams")
@tag("CompanyTeams")
interface CompanyTeams {
  /** チーム一覧（企業認証） */
  @get
  @summary("List teams of the authenticated company")
  listTeams(): TeamListResponse | BadRequestError;

  /** チーム作成（企業認証） */
  @post
  @summary("Create a team")
  createTeam(
    @body request: CreateTeamRequest,
  ): {
    @statusCode statusCode: 201;
    @body team: TeamDetailResponse;
  } | BadRequestError;

  /** チーム詳細（企業認証） */
  @get
  @route("/{teamId}")
  @summary("Get a team with members")
  getTeam(
    @path teamId: string,
  ): TeamDetailResponse | NotFoundError | BadRequestError;

  /** チーム更新（企業認証） */
  @put
  @route("/{teamId}")
  @summary("Update a team")
  updateTeam(
    @path teamId: string,
    @body request: UpdateTeamRequest,
  ): {
    @statusCode statusCode: 204;
  } | BadRequestError | NotFoundError;

  /** チーム削除（企業認証） */
  @delete
  @route("/{teamId}")
  @summary("Delete a team")
  deleteTeam(
    @path teamId: string,
  ): {
    @statusCode statusCode: 204;
  } | NotFoundError | BadRequestError;

  /** メンバー追加（企業認証） */
  @post
  @route("/{teamId}/members")
  @summary("Add a team member")
  addTeamMember(
    @path teamId: string,
    @body request: AddTeamMemberRequest,
  ): {
    @statusCode statusCode: 201;
    @body member: TeamMemberResponse;
  } | BadRequestError | NotFoundError;

  /** メンバー削除（企業認証） */
  @delete
  @route("/{teamId}/members/{memberId}")
  @summary("Remove a team member")
  removeTeamMember(
    @path teamId: string,
    @path memberId: string,
  ): {
    @statusCode statusCode: 204;
  } | NotFoundError | BadRequestError;

  /** チームスコア取得（企業認証） */
  @get
  @route("/{teamId}/scores")
  @summary("Get diagnostic scores of team members")
  getTeamScores(
    @path teamId: string,
  ): TeamScoresResponse | NotFoundError | BadRequestError;

  /** エースメンバー設定（企業認証） */
  @put
  @route("/{teamId}/ace/{memberId}")
  @summary("Set the ace member of a team")
  setAceMember(
    @path teamId: string,
    @path memberId: string,
  ): {
    @statusCode statusCode: 204;
  } | NotFoundError | BadRequestError;

  /** エースメンバー解除（企業認証） */
  @delete
  @route("/{teamId}/ace")
  @summary("Unset the ace member of a team")
  unsetAceMember(
    @path teamId: string,
  ): {
    @statusCode statusCode: 204;
  } | NotFoundError | BadRequestError;
}
