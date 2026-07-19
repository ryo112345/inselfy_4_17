import "@typespec/http";
import "@typespec/openapi3";
import "./common.tsp";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 職務経歴書アップロードのステータス */
union ResumeUploadStatus {
  "pending",
  "reviewing",
  "approved",
  "rejected",
}

/** 職務経歴書アップロード（候補者向け） */
model ResumeUploadItem {
  /** アップロードID */
  id: Uuid;

  /** 元のファイル名 */
  originalFilename: string;

  /** ステータス */
  status: ResumeUploadStatus;

  /** アップロード日時 */
  createdAt: utcDateTime;
}

/** 自分の最新アップロード状況（未アップロードなら null） */
model ResumeMineResponse {
  /** 最新のアップロード */
  upload: ResumeUploadItem | null;
}

/** 職務経歴書アップロード（管理画面向け） */
model AdminResumeItem {
  /** アップロードID */
  id: Uuid;

  /** ユーザーID */
  userId: Uuid;

  /** ユーザー表示名 */
  userName: string;

  /** ユーザー名（URL用） */
  username: string;

  /** 元のファイル名 */
  originalFilename: string;

  /** ステータス */
  status: ResumeUploadStatus;

  /** アップロード日時 */
  createdAt: utcDateTime;

  /** 更新日時 */
  updatedAt: utcDateTime;
}

/** 管理画面の職務経歴書一覧レスポンス */
model AdminResumeListResponse {
  /** アップロード一覧 */
  uploads: AdminResumeItem[];
}

/** 管理画面のドラフト取得レスポンス */
model AdminResumeDraftResponse {
  /** アップロード情報 */
  upload: AdminResumeItem;

  /** プロフィールドラフト（未保存なら null） */
  draft: unknown | null;
}

/** ドラフト保存結果 */
model AdminResumeDraftSaveResponse {
  /** 固定メッセージ */
  message: string;

  /** 保存後のステータス（reviewing） */
  status: ResumeUploadStatus;
}
