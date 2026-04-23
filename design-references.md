# UIデザイン設計原則・参考文献

HR SaaS（チーム管理画面等）のリデザイン時に適用すべきUIデザイン原則・パターン・参考文献。

## 設計原則

### 認知負荷の管理
- 人間が同時処理できる情報チャンクは **5±2個**。1画面のセクション数はこれ以内に収める
- 1画面で答えるべき問いは1つ（NNGroup）
- 認知負荷30%削減 → タスク完了速度47%向上という研究結果あり

### プログレッシブ・ディスクロージャー（段階開示）
- **プライマリ層（5-7要素）**: 最重要メトリクス、クリック不要
- **セカンダリ層**: 1インタラクションで到達
- **ターシャリ層**: パワーユーザー向け専門機能
- 完了済みのガイドは畳むか非表示にする。不要になった情報を出し続けない

### カード vs テーブルの使い分け（NNGroup）
- **カード**: ブラウジング・異種コンテンツ向き。チーム一覧など概要の閲覧に適する
- **テーブル**: 比較・同種データ向き。メンバー一覧など属性の横比較に適する
- 混同するとユーザーの情報処理効率が落ちる

### 情報の重複排除
- 一覧ページで見た数値を詳細ページで繰り返さない
- 同じ情報を複数のUIコンポーネントで表示しない（例：サマリーカード＋バナー内の進捗が重複）
- 情報は文脈に最も合う場所に1回だけ表示する

### 機能の文脈配置
- 機能の説明・操作UIは、その機能が影響を与える場所の近くに置く
- 例：「理想の人材像」はチーム平均チャートに影響する機能 → チャートセクション内に配置するのが自然
- 独立カードにすると機能との関連が伝わらない

## プログレス表示

### 円形プログレスリング
- テキスト（「3/5」）より視覚的に把握しやすい
- 完了時は緑＋チェックマーク、進行中は各診断の色（WV=緑系、CI=紫系）
- サイズは文脈で使い分け：カード内24-36px、サマリー40px

### セグメント分割
- 複数の進捗（WV/CI）は1本のバーにまとめず、個別のリングやバーで表示
- 色で種別を区別し、一目でどちらが遅れているか把握可能にする

## 空状態（Empty State）

### 3要素（NNGroup）
1. **何のセクションか**を説明するコピー
2. **視覚的な補強**（イラスト/アイコン）
3. **CTA**（次にやるべきアクション）

### 追加のベストプラクティス
- ステップフロー（例：チーム作成→メンバー追加→診断実施→結果分析）を示して全体像を把握させる
- 「何も壊れていない」と安心させるコピーにする

## 日本のHRテック参考事例

| サービス | 特徴 | URL |
|---------|------|-----|
| SmartHR | 公開デザインシステム「だれでも・効率よく・迷わずに」。React OSS | https://smarthr.design/ |
| SmartHR UI | Figmaコミュニティファイル | https://www.figma.com/community/file/978607227374353992/smarthr-ui |
| カオナビ | 内部DS「sugao」。顔写真ベースUI、表示密度切替、ドラッグ&ドロップダッシュボード | https://cocoda.design/megurukai/p/pc3960411c591 |
| HRMOS | DS「Polyphony」。2017グッドデザイン賞。デザイナーとエンジニア一体チーム | https://design.visional.inc/archives/series-polyphony-01 |
| タレントパレット | カラフルUI、クリックベース分析、組織変更の影響可視化 | https://www.pa-consul.co.jp/talentpalette/function/ |

## 参考URL

### UXリサーチ・文献（NNGroup等）
- NNGroup カードコンポーネント定義: https://www.nngroup.com/articles/cards-component/
- NNGroup 空状態: https://www.nngroup.com/articles/empty-state/
- NNGroup ダッシュボード設計: https://www.nngroup.com/articles/dashboard-design/
- NNGroup カード vs テーブル: https://www.nngroup.com/articles/cards/
- カード vs テーブル ケーススタディ: https://medium.com/design-bootcamp/when-to-use-which-component-a-case-study-of-card-view-vs-table-view-7f5a6cff557b
- テーブル vs リスト vs カードグリッド判断フレームワーク: https://uxpatterns.dev/pattern-guide/table-vs-list-vs-cards
- SaaSダッシュボード情報設計と認知負荷: https://www.sanjaydey.com/saas-dashboard-design-information-architecture-cognitive-overload/
- SaaSダッシュボード設計ガイド2026: https://f1studioz.com/blog/smart-saas-dashboard-design/
- SaaSダッシュボードUXトレンド・ガイドライン: https://arounda.agency/blog/saas-dashboard-ux-trends-guidelines-and-fundamentals

### 空状態の設計
- Empty State UXベストプラクティス (Pencil & Paper): https://www.pencilandpaper.io/articles/empty-states
- Empty State UX事例集 (Eleken): https://www.eleken.co/blog-posts/empty-state-ux
- Empty States in UX (LogRocket): https://blog.logrocket.com/ux-design/empty-states-ux-examples/
- 完全ガイド Empty State UXデザイン2025: https://ui-deploy.com/blog/complete-guide-to-empty-state-ux-design-turn-nothing-into-something-2025
- Empty States — 最も見落とされるUX要素 (Toptal): https://www.toptal.com/designers/ux/empty-state-ux-design
- SAP Fiori 空状態ガイドライン: https://www.sap.com/design-system/fiori-design-web/v1-96/foundations/best-practices/global-patterns/designing-for-empty-states

### プログレス表示・データ可視化
- プログレスインジケータUIデザイン (Mobbin): https://mobbin.com/glossary/progress-indicator
- UXPin プログレストラッカー設計: https://www.uxpin.com/studio/blog/design-progress-trackers/
- SaaS向けプログレスインジケータ: https://lollypop.design/blog/2025/november/progress-indicator-design/
- UXPin ダッシュボード設計原則: https://www.uxpin.com/studio/blog/dashboard-design-principles/
- レーダーチャート ベストプラクティス: https://www.boldbi.com/blog/radar-charts-best-practices-and-examples/
- HRデータ可視化ガイド2026: https://www.cleanchart.app/blog/hr-data-visualization
- パフォーマンス評価スパイダーチャート: https://www.performancereviewssoftware.com/spider-graph/

### デザインパターン集・テンプレート
- SaaSFrame ダッシュボード166例: https://www.saasframe.io/categories/dashboard
- SaaSFrame 空状態151例: https://www.saasframe.io/patterns/empty-state
- SaaS UIトレンド2026: https://www.saasui.design/blog/7-saas-ui-design-trends-2026
- テーブルデザインUXガイド: https://www.eleken.co/blog-posts/table-design-ux

### コンポーネント・デザインシステム
- Untitled UI プログレスサークル: https://www.untitledui.com/components/progress-circles
- カードUIデザイン: https://www.halo-lab.com/blog/card-ui-design
- アバターUIデザイン: https://www.setproduct.com/blog/avatar-ui-design
- Carbon Design System 空状態: https://carbondesignsystem.com/patterns/empty-states-pattern/
- Carbon Design System ステータスインジケータ: https://carbondesignsystem.com/patterns/status-indicator-pattern/
- Atlassian Design System: https://atlassian.design/
- Ant Design Pro ダッシュボード: https://pro.ant.design/
- Shadcn/ui ダッシュボード例: https://ui.shadcn.com/examples/dashboard
- Material Design 3: https://m3.material.io/

### HR SaaS参考
- Culture Amp チーム効果性ガイド: https://support.cultureamp.com/en/articles/7048678-guide-to-understanding-and-taking-action-on-team-effectiveness-results
- Lattice vs Culture Amp 比較: https://www.synergita.com/blog/lattice-vs-culture-amp-feature-comparison/
- Leapsome People Analytics: https://site.leapsome.com/blog/people-management-platform-analytics-dashboard-hr-metrics
- Lattice vs 15Five vs Culture Amp: https://www.outsail.co/post/lattice-vs-15five-vs-culture-amp-performance
- HRダッシュボード例 (Mesh.ai): https://www.mesh.ai/buying-guides/employee-performance-dashboard
- BambooHR ディレクトリ: https://help.bamboohr.com/s/article/587751
- SurveyMonkey ダッシュボード: https://www.surveymonkey.com/product/features/dashboards/

### 日本のHRテック追加資料
- カオナビ UIデザイナー文化: https://vivivi.kaonavi.jp/articles/ui-designer-220128/
- カオナビ ダッシュボード機能: https://www.kaonavi.jp/func/dashboard/
- HRMOS グッドデザイン賞: https://design.visional.inc/archives/1749
- HRMOS フロントエンドDS導入: https://engineering.visional.inc/blog/219/ui-components-impl-ds/
- Visional UIパターンギャラリー: https://design.visional.inc/archives/ui-pattern-gallery
- タレントパレット UI改善: https://prtimes.jp/main/html/rd/p/000000174.000023180.html

### コラボツールのチーム管理パターン
- Notion Teamspacesガイド: https://www.notion.com/help/guides/teamspaces-give-teams-home-for-important-work
- Figma チーム運用ベストプラクティス: https://www.figma.com/best-practices/getting-started-with-teams-in-figma-organization/
- Linear デザインシステム (Figma): https://www.figma.com/community/file/1222872653732371433/linear-design-system

### デザインインスピレーション
- Dribbble チーム管理: https://dribbble.com/tags/team-management-dashboard
- Dribbble HRダッシュボード: https://dribbble.com/tags/hr-management-dashboard
- Behance HR管理UI: https://www.behance.net/search/projects/Human%20Resource%20Management%20ui%20design
