import "@typespec/http";
import "@typespec/openapi3";
import "./common.tsp";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 検索結果: ユーザー */
model SearchUserItem {
  /** ユーザーID */
  id: Uuid;

  /** ユーザー名 */
  username: string;

  /** 表示名 */
  name: string;

  /** 見出し（肩書き） */
  headline?: string;

  /** アバターURL */
  avatarUrl?: string;

  /** プロフィールカラー */
  profileColor?: string;
}

/** 検索結果: 記事 */
model SearchArticleItem {
  /** 記事ID */
  id: Uuid;

  /** タイトル */
  title: string;

  /** 本文スニペット（先頭部分） */
  excerpt: string;

  /** 著者名 */
  authorName: string;

  /** タグ */
  tags: string[];

  /** 有料記事か */
  isPaid: boolean;

  /** 公開日時 */
  publishedAt: utcDateTime;
}

/** 検索結果: 投稿 */
model SearchPostItem {
  /** 投稿ID */
  id: Uuid;

  /** 投稿者ユーザーID */
  userId: Uuid;

  /** 投稿者ユーザー名 */
  username: string;

  /** 投稿者表示名 */
  name: string;

  /** 本文 */
  content: string;

  /** 作成日時 */
  createdAt: utcDateTime;
}

/** 検索結果: 求人 */
model SearchJobItem {
  /** 求人ID */
  id: Uuid;

  /** 求人タイトル */
  title: string;

  /** 企業名 */
  companyName?: string;

  /** 企業ロゴURL */
  companyLogoUrl?: string;

  /** 雇用形態 */
  employmentType: string;

  /** 勤務地 */
  location?: string;

  /** 作成日時 */
  createdAt: utcDateTime;
}

/** ユーザー検索結果一覧 */
model SearchUserListResponse is ListResponse<SearchUserItem>;

/** 記事検索結果一覧 */
model SearchArticleListResponse is ListResponse<SearchArticleItem>;

/** 投稿検索結果一覧 */
model SearchPostListResponse is ListResponse<SearchPostItem>;

/** 求人検索結果一覧 */
model SearchJobListResponse is ListResponse<SearchJobItem>;

/** 横断検索結果（カテゴリごとの上位数件＋総件数） */
model SearchAllResponse {
  /** ユーザー */
  users: SearchUserListResponse;

  /** 記事 */
  articles: SearchArticleListResponse;

  /** 投稿 */
  posts: SearchPostListResponse;

  /** 求人 */
  jobs: SearchJobListResponse;
}
