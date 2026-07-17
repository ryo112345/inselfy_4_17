// talent-search feature の React Query キー。
//
// - 生成エンドポイントのレスポンスをそのままキャッシュする query は、orval 生成の
//   getXxxQueryKey() を使う（キー手書き禁止。invalidation も同じ関数で一致させる）。
// - 複数APIの合成・加工結果（生成レスポンスと形が違うデータ）をキャッシュする query は
//   手書きキーを使う。生成キーを流用すると、同じキーに別形のデータが同居して壊れるため。
//   規約: [<feature名>, <リソース>, パラメータ...]
import { getSavedCandidatesListSavedCandidatesQueryKey } from "@/external/client/api/orval/generated/endpoints/saved-candidates/saved-candidates";

// 保存候補者一覧（無限スクロール）。ページはこのキー1本に全ページを積む
export const savedCandidatesQueryKey = getSavedCandidatesListSavedCandidatesQueryKey();

// 5API合成の候補者詳細（手書き queryFn: fetchCandidateDetail）
export const candidateDetailQueryKey = (username: string | undefined, userId: string | null) =>
  ["talent-search", "candidateDetail", username, userId] as const;

// チームスコアの平均算出結果（手書き queryFn: fetchTeamScoreAverages）
export const teamScoreAveragesQueryKey = (teamId: string) =>
  ["talent-search", "teamScoreAverages", teamId] as const;

// kind別ディスパッチの検索結果（手書き queryFn: searchTalents）
export const talentSearchQueryKey = (kind: string, params: Record<string, string>) =>
  ["talent-search", "search", kind, params] as const;
