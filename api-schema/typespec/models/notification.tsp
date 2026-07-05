import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 通知 */
model NotificationResponse {
  /** ID */
  id: string;

  /** 通知種別 */
  type: string;

  /** タイトル */
  title: string;

  /** 本文 */
  body: string;

  /** 関連リソースID */
  referenceId: string | null;

  /** 既読か */
  isRead: boolean;

  /** 作成日時 */
  createdAt: utcDateTime;
}

/** 通知一覧 */
model NotificationListResponse {
  /** 通知 */
  items: NotificationResponse[];

  /** 総件数 */
  total: int32;
}

/** 未読件数 */
model UnreadCountResponse {
  /** 未読数 */
  count: int32;
}
