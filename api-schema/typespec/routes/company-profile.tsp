import "@typespec/http";
import "@typespec/openapi3";
import "../models/company-profile.tsp";
import "../models/common.tsp";

using TypeSpec.Http;
using Inselfy.Models;

namespace Inselfy.Routes;

@route("/api/companies/{id}")
@tag("CompanyProfile")
interface PublicCompanyProfiles {
  /** 企業公開プロフィール取得 */
  @get
  @summary("Get a public company profile")
  getPublicCompanyProfile(
    @path id: string,
  ): PublicCompanyProfileResponse | NotFoundError | BadRequestError;
}

@route("/api/company/profile")
@tag("CompanyProfile")
@useAuth(Models.CompanyAuth)
interface CompanyProfiles {
  /** 自社プロフィール取得（企業認証） */
  @get
  @summary("Get the authenticated company's profile")
  getCompanyProfile(): CompanyProfileResponse | NotFoundError | BadRequestError | UnauthorizedError;

  /** 自社プロフィール更新（企業認証）。更新後の全プロフィールを返す */
  @put
  @summary("Update the authenticated company's profile")
  updateCompanyProfile(
    @body request: UpdateCompanyProfileRequest,
  ): CompanyProfileResponse | BadRequestError | UnauthorizedError;

  /** 画像アップロード（企業認証）。type=logo|cover|gallery */
  @post
  @route("/image")
  @summary("Upload a company profile image")
  uploadCompanyProfileImage(
    @header contentType: "multipart/form-data",

    /** 画像種別（logo / cover / gallery） */
    @query type: string,

    @multipartBody body: {
      file: HttpPart<bytes>;
    },
  ): UploadUrlResponse | BadRequestError | UnauthorizedError;

  /** 画像削除（企業認証）。type=logo|cover|gallery、gallery は url 指定 */
  @delete
  @route("/image")
  @summary("Delete a company profile image")
  deleteCompanyProfileImage(
    /** 画像種別（logo / cover / gallery） */
    @query type: string,

    /** 削除するギャラリー画像URL（type=gallery のとき） */
    @query url?: string,
  ): {
    @statusCode statusCode: 204;
  } | BadRequestError | UnauthorizedError;
}
