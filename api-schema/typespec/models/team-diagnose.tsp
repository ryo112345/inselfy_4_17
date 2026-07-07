import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** チーム診断リンク情報 */
model DiagnoseInfoResponse {
  /** チームメンバーID */
  memberId: Uuid;

  /** メンバー名 */
  memberName: string;

  /** チーム名 */
  teamName: string;

  /** 企業名 */
  companyName: string;

  /** 紐づくユーザーID（未紐づけは空文字） */
  userId: string;

  /** Work Values 診断ステータス */
  wvStatus: TeamDiagnosisStatus;

  /** Career Interest 診断ステータス */
  ciStatus: TeamDiagnosisStatus;

  /** 招待メールアドレス */
  email: string | null;
}

/** チーム診断ステータス更新リクエスト（指定したキーのみ更新） */
model UpdateDiagnoseStatusRequest {
  /** Work Values 診断ステータス */
  wvStatus?: TeamDiagnosisStatus;

  /** Career Interest 診断ステータス */
  ciStatus?: TeamDiagnosisStatus;
}
