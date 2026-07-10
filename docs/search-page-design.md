# /search「みつける」ページ 設計書

作成: 2026-07-10。サイドバー・モバイルフッターからリンク済みだが未実装の `/search` を設計する。

## 1. 前提・リサーチからの設計判断

### 検索と探索は別の行為（両方に応える）

検索画面には「**検索**（探したいものが決まっている＝既知情報）」と「**探索**（決まっていない＝未知情報の発見）」の2つの用途がある（セブンデックスの8アプリ比較より）。SNS系（X/Instagram）はレコメンド＋トレンドで探索に寄せ、Slackのような業務ツールは検索に振り切る。

「みつける」はタイムライン（ホーム）とは別に置かれた発見用タブなので、**クエリ未入力時は探索（発見フィード）、入力時は検索**として両対応する。

### 結果表示はブレンド型＋タブ切替（LinkedIn型）

LinkedIn Unified Search の知見:
- 検索前にコンテンツ種別を選ばせるドロップダウンを廃止し、クエリから意図を推定してブレンドした結果ページを構築する
- ただし意図推定が外れたときのために**バーティカル切替（タブ）を残す**

本プロジェクトでは Phase 1 で意図推定はせず、「すべて」タブで各カテゴリの上位数件をセクション表示（federated/blended）し、タブで各カテゴリに絞り込める形にする。カテゴリ見出し・件数表示・「もっと見る」を付ける（Pencil & Paper の search UX ベストプラクティス: カテゴリヘッダでスキャン性を上げる、ヒット件数を出す、マッチ箇所をハイライト）。

### 空状態を空にしない

- **クエリ未入力（zero-query）**: 最近の検索・人気タグ・おすすめコンテンツを表示する（X/Instagram の発見タブパターン）
- **0件ヒット**: 「見つかりませんでした」で終わらせず、キーワード候補や人気コンテンツへの導線を出す

## 2. 検索対象

| カテゴリ | 対象フィールド | 既存API |
|---|---|---|
| ユーザー | username, name, headline, スキル名 | なし（新設） |
| 記事 | title, body, tags | `GET /api/articles`（キーワード検索なし） |
| 投稿 | body | `GET /api/posts`（キーワード検索なし） |
| 求人 | title, description ほか | `GET /api/jobs?search=` あり |

企業アカウント検索は Phase 2 以降（`/companies` があるため優先度低）。

## 3. UI設計

### 3.1 レイアウト

```
┌────────────────────────────────────┐
│ [🔍 キーワードで みつける        ×] │ ← 上部固定・遷移直後 autofocus
├────────────────────────────────────┤
│ すべて | ユーザー | 記事 | 投稿 | 求人 │ ← クエリ入力後のみ表示
├────────────────────────────────────┤
│ （結果 or 発見フィード）             │
└────────────────────────────────────┘
```

### 3.2 クエリ未入力時（発見フィード）

Phase 1（既存APIだけで作れる範囲）:
- **最近の検索**: localStorage 最大5件、個別削除可
- **人気のタグ**: 公開記事の tags を集計して上位を chip 表示（タップで `?q=` 検索）
- **おすすめユーザー**: 新着 or 診断済みユーザーを数名カード表示（Phase 1 は新着で代替）
- **新着記事**: 既存 `GET /api/articles` の先頭数件

### 3.3 クエリ入力時

- 入力は 300ms デバウンス、未確定でも検索実行（インクリメンタル）。リクエストは AbortController でキャンセル（frontend-refactor-plan F4 と同じ扱い）
- **すべてタブ**: カテゴリごとにセクション（見出し＋件数＋上位3件＋「もっと見る」）。0件のカテゴリはセクションごと非表示
- **各カテゴリタブ**: そのカテゴリのみ、ページング（もっと見るボタン式）
- マッチ箇所は `<mark>` でハイライト（タイトル・見出しのみ。本文はスニペット化）
- URL同期: `/search?q=...&tab=users`。リロード・共有・戻るで状態復元
- 0件時: 「"{q}" に一致する結果はありません」＋人気タグ chips を再掲

### 3.4 モバイル

フッターの虫眼鏡タブから遷移。レイアウトは1カラムのまま同一コンポーネントで対応（既存ページと同様 Tailwind のレスポンシブで）。

## 4. API設計（スキーマファースト）

### 新設: `GET /api/search`

横断検索用の統合エンドポイントを1本新設する（各リストAPIに `q` を生やすより、認可・ランキング・ログを1箇所に集約できる）。

```
GET /api/search?q=golang&type=all&limit=3
GET /api/search?q=golang&type=articles&limit=20&offset=0
```

- `q`: 必須、1〜100文字
- `type`: `all | users | articles | posts | jobs`（省略時 all）
- `all` のとき: 各カテゴリ上位 `limit` 件（デフォルト3）＋カテゴリごとの `total`
- 単一 type のとき: `{items, total}` 形式（契約クリーンアップ方針に準拠）
- レスポンスは camelCase、TypeSpec は `api-schema/typespec/models/search.tsp` に定義 → `make` で oapi-codegen / フロントSDK 再生成
- 認可: ログイン済み全員（診断系と同じ閲覧ポリシー）。求人・公開記事のみ対象、下書きは除外

### バックエンド実装（経路ルール準拠）

複合読み取り・動的SQLなので **QueryService port を新設して gateway に置く**:

```
search_controller.go → SearchInputPort → search_interactor.go
  → SearchQueryService (port) → search_query_gateway.go（動的SQL）
```

- Phase 1 の検索は `ILIKE '%q%'`（posts.body / articles.title,body,tags / users.username,name,headline / job_postings.title,description）
- 日本語なので形態素解析系の全文検索は導入せず、まず ILIKE。遅くなったら pg_trgm + GIN index（Phase 3）
- ソート: Phase 1 は新着順（published_at / created_at DESC）。関連度ランキングは Phase 3

## 5. フェーズ分割

| Phase | 内容 |
|---|---|
| **1** | `GET /api/search` 新設（ILIKE・新着順）＋ `/search` ページ（検索バー・すべて/カテゴリタブ・URL同期・0件状態・最近の検索） |
| **2** | 発見フィード充実（人気タグ集計API・おすすめユーザー）、ハイライト精緻化、検索サジェスト |
| **3** | 関連度ランキング（pg_trgm）、意図推定によるカテゴリ並び順の動的化、企業検索 |

## 6. 参考資料

- [LinkedIn Engineering: Unifying the LinkedIn Search Experience](https://www.linkedin.com/blog/engineering/search/unifying-linkedin-search-experience) — ブレンド結果＋意図推定＋バーティカル切替
- [Pencil & Paper: Search UX Best Practices](https://www.pencilandpaper.io/articles/search-ux) — カテゴリヘッダ・ハイライト・件数・空状態
- [セブンデックス: 検索画面のUIデザイン｜8つのアプリを比較考察](https://sevendex.com/post/11190/) — 検索/探索の区別、アプリ別パターン
- [Algolia: Best practices for federated search](https://www.algolia.com/blog/product/best-practices-for-federated-search) — federated search の構成
- [Pencil & Paper: Empty State UX](https://www.pencilandpaper.io/articles/empty-states) — 空状態を空にしない
