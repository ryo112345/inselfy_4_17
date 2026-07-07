import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 通知種別 */
union NotificationType {
  "scout_received",
  "scout_replied",
  "scout_interested",
  "scout_declined",
  "scout_expired",
  "credit_replenished",
  "quality_warning",
}

/** 通知 */
model NotificationResponse {
  /** ID */
  id: Uuid;

  /** 通知種別 */
  type: NotificationType;

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
model NotificationListResponse is ListResponse<NotificationResponse>;

/** 未読件数 */
model UnreadCountResponse {
  /** 未読数 */
  count: int32;
}
