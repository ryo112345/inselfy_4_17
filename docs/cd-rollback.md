# 本番CD＋ロールバック設計（C10）

main へのマージを起点に「CI ゲート → キーレスデプロイ → 検証 → トラフィック切替」を
自動化した。ここにはパイプラインの全体像・ロールバック手順（runbook）・
マイグレーション規律（expand-contract）をまとめる。

## パイプライン全体像（`.github/workflows/deploy.yml`）

```
push to main（backend/frontend/Dockerfile 等に変更がある時だけ）
  │
  ├─ CI ゲート（reusable workflow を並列で呼ぶ。全部緑でないと deploy に進めない）
  │    backend CI / frontend CI / migrations CI / e2e smoke
  │
  └─ deploy ジョブ（needs: 上の4つ、id-token: write）
       1. OIDC 認証（WIF → github-deployer SA。長期クレデンシャル無し）
       2. docker build → Artifact Registry へ push（タグ = git SHA 12桁）
       3. Neon へ migrate up（direct エンドポイント。expand-contract 縛り ↓）
       4. gcloud run deploy --no-traffic --tag candidate（トラフィック 0% で新リビジョン作成）
          ＋ startup probe /api/readyz・liveness probe /api/healthz
       5. candidate タグ URL の /api/readyz を検証（失敗しても本番は無傷）
       6. update-traffic --to-latest（ここで初めて本番トラフィックが新リビジョンへ）
```

- **トレーサビリティ:** イメージタグ = git SHA なので、Cloud Run リビジョン → イメージタグ →
  コミットが一意に辿れる。「本番で動いているのはどのコード？」に即答できる。
- **docs だけの push では deploy は走らない**（paths フィルタ）。強制的に出し直したいときは
  Actions → deploy → Run workflow（main の HEAD をデプロイ）。
- probe が `/api/*` 経由なのは、コンテナ内で Next(8080) と Go API(8081) が同居しており
  Cloud Run の probe は 8080 にしか届かないため（front の catch-all proxy を通す）。
  この経路は e2e-smoke でも常時検証している。

## ロールバック手順（runbook）

### 通常: GitHub Actions から 1 クリック

1. GitHub → Actions → **rollback** → Run workflow
2. `revision` は**空のまま**実行 → 「現在 100% 配信中の 1 つ前の Ready リビジョン」へ自動で戻る
   （特定リビジョンに戻したい場合のみ名前を指定。リビジョン一覧は
   `gcloud run revisions list --service inselfy --region asia-northeast1`）
3. 完了後、サイトの動作を確認する
4. **復帰:** 原因コミットを revert して main にマージ（通常の CD が走る）。
   訓練などコード起因でない場合は Actions → deploy → Run workflow で HEAD に戻す

イメージ再ビルドは不要（旧リビジョンのイメージをそのまま配信）なので数十秒で完了する。

### 緊急: GitHub Actions 自体が落ちている場合

```bash
# 戻し先を確認
gcloud run revisions list --service inselfy --region asia-northeast1
# 100% 切り替え
gcloud run services update-traffic inselfy --region asia-northeast1 --to-revisions=<REVISION>=100
```

`--to-latest` は使わない（壊れた最新リビジョンに向く可能性があるため、必ず名前指定）。

## マイグレーション規律: expand-contract（後方互換縛り）

マイグレーションは **deploy 前**（トラフィック切替のさらに前）に走る。つまり:

- candidate 検証で落ちた場合も、ロールバックした場合も、**旧コードが新スキーマの上で動く**
- したがってマイグレーションは常に後方互換でなければならない

**やってよい（expand）:** テーブル追加 / カラム追加（NOT NULL なら DEFAULT 付き）/
インデックス追加 / 新カラムへの書き込み開始。

**すぐやってはいけない（contract）:** カラム・テーブル削除 / カラム名変更 / NOT NULL 化 /
型変更。これらは**「参照を消したリリースが本番で安定した"次の"リリース」**でのみ行う:

1. リリース N: コードから参照を消す（スキーマは触らない）
2. リリース N+1: 参照が消えた状態で本番が安定していることを確認してから DROP 等を流す

カラム名変更は「新カラム追加 → 両書き → 読み替え → 旧カラム削除」の 3〜4 リリースに分割する。

この規律は migrations CI の append-only チェック（適用済みマイグレーションの書き換え禁止）と
セットで機械的に守る。`down -all` 禁止等の基本ルールは `CLAUDE.md` の「マイグレーション」節。

## 権限設計（最小権限・キーレス）

- GitHub には**シークレットを一切置いていない**。GCP 認証は Workload Identity Federation
  （リポジトリ `ryo112345/inselfy_4_17` 限定の attribute condition 付き）で
  `github-deployer@inselfy.iam.gserviceaccount.com` の短命トークンを取得する。
- `github-deployer` の権限: `roles/run.developer`（デプロイ・トラフィック切替）＋
  ランタイム SA への `iam.serviceAccountUser`＋ Artifact Registry リポジトリ単位の
  `artifactregistry.writer` ＋ `db-password` シークレット単体への `secretAccessor`（migrate 用）。
- `--allow-unauthenticated` はデプロイコマンドに**付けない**: `run.developer` には
  `setIamPolicy` が無いので付けると失敗する。既存の allUsers invoker バインディングは
  フラグ省略で維持されるため不要（これにより `run.admin` へ昇格せず最小権限で済む）。
