import "@typespec/http";
import "@typespec/openapi3";

using TypeSpec.Http;

namespace Inselfy.Models;

/** 記事ステータス */
union ArticleStatus {
  "draft",
  "published",
}

/** 記事作成リクエスト */
model CreateArticleRequest {
  /** タイトル */
  @maxLength(200)
  title: string;

  /** 本文 */
  @maxLength(100000)
  body: string;

  /** 有料記事か */
  isPaid: boolean;

  /** 価格（円） */
  @minValue(0)
  @maxValue(1000000)
  priceYen: integer;

  /** カバー画像URL */
  coverImageUrl?: string | null;

  /** タグ（各タグは50文字以内） */
  @maxItems(10)
  tags: string[];
}

/** 記事更新リクエスト */
model UpdateArticleRequest is CreateArticleRequest;

/** 記事 */
model ArticleResponse {
  /** 記事ID */
  id: string;

  /** 著者種別（user / company） */
  authorType: string;

  /** 著者名 */
  authorName: string;

  /** 著者ユーザー名（ユーザー記事のみ） */
  authorUsername?: string;

  /** タイトル */
  title: string;

  /** 本文（有料記事は未購入時に空文字） */
  body: string;

  /** 無料プレビュー部分 */
  freePreview: string;

  /** 有料記事か */
  isPaid: boolean;

  /** 価格（円） */
  priceYen: integer;

  /** 購入済みか */
  purchased: boolean;

  /** 閲覧者が著者か */
  isAuthor: boolean;

  /** 文字数 */
  charCount: integer;

  /** 画像数 */
  imageCount: integer;

  /** ステータス */
  status: ArticleStatus;

  /** カバー画像URL */
  coverImageUrl?: string;

  /** タグ */
  tags: string[];

  /** 作成日時 */
  createdAt: utcDateTime;

  /** 更新日時 */
  updatedAt: utcDateTime;

  /** 公開日時 */
  publishedAt?: utcDateTime;
}

/** 記事一覧 */
model ArticleListResponse {
  /** 記事 */
  items: ArticleResponse[];

  /** 総件数 */
  total: integer;
}

/** Stripe チェックアウトセッション */
model CheckoutSessionResponse {
  /** チェックアウトURL */
  url: string;
}
