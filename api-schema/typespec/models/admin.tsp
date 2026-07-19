import "@typespec/http";
import "@typespec/openapi3";
import "./common.tsp";
import "./company-auth.tsp";

using TypeSpec.Http;

namespace Inselfy.Models;

// admin API は X-Admin-Key 運用の内部向けコンソール用。レスポンスの形は
// 実装（admin_*_controller.go）が正であり、公開 API の camelCase 統一より
// 現物互換を優先している（snake_case が混在するのは意図的）。

/** 管理者 */
model AdminItem {
  /** 管理者ID */
  id: Uuid;

  /** メールアドレス */
  email: string;

  /** 表示名 */
  name: string;

  /** 個人APIトークンのプレフィックス（未発行なら null） */
  api_key_prefix: string | null;

  /** 個人APIトークンの最終使用日時（未使用なら null） */
  last_used_at: utcDateTime | null;

  /** 作成日時 */
  created_at: utcDateTime;
}

/** 管理者一覧レスポンス */
model AdminListResponse {
  /** 管理者一覧 */
  admins: AdminItem[];
}

/** 管理者作成リクエスト */
model CreateAdminRequest {
  /** メールアドレス */
  email: string;

  /** 表示名 */
  name?: string;
}

/** 個人APIトークン発行レスポンス（トークンはこの一度だけ返る） */
model AdminIssueKeyResponse {
  /** 更新後の管理者 */
  admin: AdminItem;

  /** 発行された個人APIトークン（`admin_` プレフィックス） */
  api_key: string;
}

/** 管理画面のユーザー一覧アイテム */
model AdminUserItem {
  /** ユーザーID */
  id: Uuid;

  /** ユーザー名 */
  username: string;

  /** 表示名 */
  name: string;

  /** メールアドレス */
  email: string | null;

  /** アバターURL */
  avatar_url: string | null;

  /** 作成日時 */
  created_at: utcDateTime;
}

/** 管理画面のユーザー一覧レスポンス */
model AdminUserListResponse {
  /** ユーザー一覧 */
  users: AdminUserItem[];

  /** 総件数 */
  @minValue(0)
  total: int64;

  /** 現在ページ（1始まり） */
  page: int32;

  /** 1ページあたり件数 */
  per_page: int32;

  /** 総ページ数 */
  total_pages: int32;
}

/** 管理画面の企業一覧アイテム */
model AdminCompanyItem {
  /** 企業アカウントID */
  id: Uuid;

  /** メールアドレス */
  email: string;

  /** 企業名 */
  companyName: string;

  /** 担当者名 */
  contactPersonName: string;

  /** 電話番号 */
  phoneNumber: string;

  /** 承認ステータス */
  status: CompanyStatus;

  /** 作成日時 */
  createdAt: utcDateTime;
}

/** 管理画面の企業一覧レスポンス */
model AdminCompanyListResponse {
  /** 企業一覧 */
  companies: AdminCompanyItem[];

  /** 総件数 */
  @minValue(0)
  total: int64;

  /** 現在ページ（1始まり） */
  page: int32;

  /** 1ページあたり件数 */
  per_page: int32;

  /** 総ページ数 */
  total_pages: int32;
}

/** 企業ステータス更新リクエスト */
model UpdateCompanyStatusRequest {
  /** 更新後ステータス */
  status: "approved" | "rejected";
}

/** ユーザー成り代わりログイン結果（cookie はレスポンスで焼かれる） */
model AdminUserBypassLoginResponse {
  /** 固定で "ok" */
  message: string;

  /** ログインしたユーザーのユーザー名 */
  username: string;
}

/** 企業成り代わりログイン結果（cookie はレスポンスで焼かれる） */
model AdminCompanyBypassLoginResponse {
  /** 固定で "ok" */
  message: string;

  /** ログインした企業の企業名 */
  companyName: string;
}

/** 処理結果メッセージ */
model AdminMessageResponse {
  /** 固定で "ok" */
  message: string;
}

/** AIレポート未生成の診断セッション（Work Values / Career Interest 共通） */
model AdminPendingSessionItem {
  /** セッションID */
  session_id: Uuid;

  /** ユーザーID */
  user_id: Uuid;

  /** ユーザー名 */
  username: string;

  /** 表示名 */
  name: string;

  /** 診断完了日時 */
  completed_at: utcDateTime | null;

  /** レポート生成リクエスト日時 */
  report_requested_at: utcDateTime | null;
}

/** AIレポート未生成セッション一覧レスポンス */
model AdminPendingSessionsResponse {
  /** セッション一覧 */
  sessions: AdminPendingSessionItem[];

  /** 総件数 */
  @minValue(0)
  total: int32;
}

/** AIレポート保存リクエスト */
model AdminSaveReportRequest {
  /** レポート本文（Markdown） */
  @minLength(1)
  content: string;
}

/** 保存済みAIレポート（Work Values / Career Interest 共通） */
model AdminSavedAiReportResponse {
  /** レポートID */
  id: Uuid;

  /** セッションID */
  session_id: Uuid;

  /** レポート本文（Markdown） */
  content: string;

  /** 作成日時 */
  created_at: utcDateTime;
}

/** 生成済みAIレポート一覧アイテム（Work Values / Career Interest 共通） */
model AdminAiReportListItem {
  /** レポートID */
  id: Uuid;

  /** セッションID */
  session_id: Uuid;

  /** ユーザーID */
  user_id: Uuid;

  /** ユーザー名 */
  username: string;

  /** 表示名 */
  name: string;

  /** 作成日時 */
  created_at: utcDateTime;

  /** ユーザーの閲覧日時（未閲覧なら null） */
  viewed_at: utcDateTime | null;
}

/** 生成済みAIレポート一覧レスポンス */
model AdminAiReportListResponse {
  /** レポート一覧 */
  reports: AdminAiReportListItem[];

  /** 総件数 */
  @minValue(0)
  total: int32;
}

/** Work Values セッションのスコア（レポート生成用の生データ） */
model AdminSessionScoresResponse {
  /** ニーズ別 BT 強度 μ */
  mu: Record<float64>;

  /** ニーズ別標準誤差 SE */
  se: Record<float64>;

  /** 整合性係数 ζ（未計算なら省略） */
  consistency_coefficient?: float32;

  /** 整合性レベル（未計算なら省略） */
  consistency_level?: string;
}

/** レポート生成用プロンプト */
model AdminPromptResponse {
  /** データ埋め込み済みのプロンプト全文 */
  prompt: string;
}

/** 統合レポート未生成リクエスト */
model AdminPendingIntegratedRequestItem {
  /** リクエストID */
  request_id: Uuid;

  /** ユーザーID */
  user_id: Uuid;

  /** ユーザー名 */
  username: string;

  /** 表示名 */
  name: string;

  /** トピック1 */
  topic1: int16;

  /** トピック2 */
  topic2: int16;

  /** トピック3 */
  topic3: int16;

  /** 自由記述 */
  free_text: string;

  /** 作成日時 */
  created_at: utcDateTime;
}

/** 統合レポート未生成リクエスト一覧レスポンス */
model AdminPendingIntegratedRequestsResponse {
  /** リクエスト一覧 */
  requests: AdminPendingIntegratedRequestItem[];

  /** 総件数 */
  @minValue(0)
  total: int32;
}

/** 保存済み統合レポート */
model AdminSavedIntegratedReportResponse {
  /** レポートID */
  id: Uuid;

  /** リクエストID */
  request_id: Uuid;

  /** レポート本文（Markdown） */
  content: string;

  /** 作成日時 */
  created_at: utcDateTime;
}

/** 生成済み統合レポート一覧アイテム */
model AdminIntegratedReportListItem {
  /** レポートID */
  id: Uuid;

  /** リクエストID */
  request_id: Uuid;

  /** ユーザーID */
  user_id: Uuid;

  /** ユーザー名 */
  username: string;

  /** 表示名 */
  name: string;

  /** 作成日時 */
  created_at: utcDateTime;

  /** ユーザーの閲覧日時（未閲覧なら null） */
  viewed_at: utcDateTime | null;
}

/** 生成済み統合レポート一覧レスポンス */
model AdminIntegratedReportListResponse {
  /** レポート一覧 */
  reports: AdminIntegratedReportListItem[];

  /** 総件数 */
  @minValue(0)
  total: int32;
}
