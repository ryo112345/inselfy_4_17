import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** チーム診断リンク情報 */
model DiagnoseInfoResponse {
  /** チームメンバーID */
  member_id: string;

  /** メンバー名 */
  member_name: string;

  /** チーム名 */
  team_name: string;

  /** 企業名 */
  company_name: string;

  /** 紐づくユーザーID（未紐づけは空文字） */
  user_id: string;

  /** Work Values 診断ステータス */
  wv_status: string;

  /** Career Interest 診断ステータス */
  ci_status: string;

  /** 招待メールアドレス */
  email: string | null;
}

/** チーム診断ステータス更新リクエスト（指定したキーのみ更新） */
model UpdateDiagnoseStatusRequest {
  /** Work Values 診断ステータス */
  wv_status?: string | null;

  /** Career Interest 診断ステータス */
  ci_status?: string | null;
}
