import "@typespec/http";
import "@typespec/openapi3";
import "../models/scout-template.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/company/scout-templates")
@tag("ScoutTemplates")
@useAuth(Models.CompanyAuth)
interface ScoutTemplates {
  /** スカウトテンプレート作成（企業認証） */
  @post
  @summary("Create a scout template")
  createScoutTemplate(
    @body request: CreateScoutTemplateRequest,
  ): {
    @statusCode statusCode: 201;
    @body template: ScoutTemplateResponse;
  } | BadRequestError | UnauthorizedError;

  /** スカウトテンプレート一覧（企業認証） */
  @get
  @summary("List scout templates")
  listScoutTemplates(): ScoutTemplateListResponse | BadRequestError | UnauthorizedError;

  /** スカウトテンプレート取得（企業認証） */
  @get
  @route("/{templateId}")
  @summary("Get a scout template")
  getScoutTemplate(
    @path templateId: string,
  ): ScoutTemplateResponse | NotFoundError | BadRequestError | UnauthorizedError;

  /** スカウトテンプレート更新（企業認証） */
  @put
  @route("/{templateId}")
  @summary("Update a scout template")
  updateScoutTemplate(
    @path templateId: string,
    @body request: UpdateScoutTemplateRequest,
  ): ScoutTemplateResponse | BadRequestError | NotFoundError | UnauthorizedError;

  /** スカウトテンプレート削除（企業認証） */
  @delete
  @route("/{templateId}")
  @summary("Delete a scout template")
  deleteScoutTemplate(
    @path templateId: string,
  ): {
    @statusCode statusCode: 204;
  } | NotFoundError | BadRequestError | UnauthorizedError;
}
