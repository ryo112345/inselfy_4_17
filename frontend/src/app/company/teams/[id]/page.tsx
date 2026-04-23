"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCompanyAuth } from "@/features/company-auth/company-auth-context";

type Member = {
  id: string;
  name: string;
  email: string | null;
  invite_token: string;
  wv_status: string;
  ci_status: string;
  is_ace: boolean;
  created_at: string;
};

type Score = {
  id: string;
  display_score: number;
  rank: number;
};

type MemberScore = {
  member_id: string;
  member_name: string;
  wv_status: string;
  ci_status: string;
  is_ace: boolean;
  wv_scores: Score[] | null;
  ci_scores: Score[] | null;
};

type TeamDetail = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  members: Member[];
  created_at: string;
};

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { companyFetch } = useCompanyAuth();
  const teamId = params.id as string;

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [memberScores, setMemberScores] = useState<MemberScore[]>([]);
  const [viewMode, setViewMode] = useState<string>("average");

  const fetchTeamScores = useCallback(async () => {
    try {
      const res = await companyFetch(`/api/company/teams/${teamId}/scores`);
      if (!res.ok) return;
      const data = await res.json();
      setMemberScores(data.members || []);
    } catch {}
  }, [teamId, companyFetch]);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await companyFetch(`/api/company/teams/${teamId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTeam(data);
    } catch {
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }, [teamId, companyFetch]);

  useEffect(() => {
    fetchTeam();
    fetchTeamScores();
  }, [fetchTeam, fetchTeamScores]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim()) return;
    setAdding(true);
    setError("");

    try {
      const res = await companyFetch(`/api/company/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: memberName.trim(),
          email: memberEmail.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "追加に失敗しました");
      }
      setMemberName("");
      setMemberEmail("");
      setShowAddForm(false);
      await fetchTeam();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!confirm(`${name}さんをチームから削除しますか？診断データも失われます。`)) return;
    try {
      await companyFetch(`/api/company/teams/${teamId}/members/${memberId}`, {
        method: "DELETE",
      });
      await fetchTeam();
    } catch {}
  };

  const handleToggleAce = async (memberId: string, currentlyAce: boolean) => {
    try {
      if (currentlyAce) {
        await companyFetch(`/api/company/teams/${teamId}/ace`, { method: "DELETE" });
      } else {
        await companyFetch(`/api/company/teams/${teamId}/ace/${memberId}`, { method: "PUT" });
      }
      await fetchTeam();
      await fetchTeamScores();
    } catch {}
  };

  const handleDeleteTeam = async () => {
    if (!confirm("このチームを削除しますか？メンバーと診断データもすべて失われます。")) return;
    try {
      await companyFetch(`/api/company/teams/${teamId}`, {
        method: "DELETE",
      });
      router.push("/company/teams");
    } catch {}
  };

  const copyInviteUrl = (token: string) => {
    const url = `${window.location.origin}/diagnose/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#2979ff]" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">チームが見つかりません</p>
        <Link href="/company/teams" className="text-sm text-[#2979ff] hover:underline mt-2 inline-block">
          チーム一覧に戻る
        </Link>
      </div>
    );
  }

  const wvCompleted = team.members.filter((m) => m.wv_status === "completed").length;
  const ciCompleted = team.members.filter((m) => m.ci_status === "completed").length;
  const allDone = team.members.length > 0 && wvCompleted === team.members.length && ciCompleted === team.members.length;

  return (
    <div>
      <Link
        href="/company/teams"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
        チーム一覧に戻る
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
          {team.description && <p className="mt-1 text-sm text-gray-500">{team.description}</p>}
        </div>
        <button
          onClick={handleDeleteTeam}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
        >
          チームを削除
        </button>
      </div>

      {/* Progress Summary */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-4">診断進捗</h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{team.members.length}</p>
            <p className="text-xs text-gray-500 mt-1">メンバー</p>
          </div>
          <div className="text-center">
            <p className={`text-3xl font-bold ${wvCompleted === team.members.length && team.members.length > 0 ? "text-emerald-600" : "text-gray-900"}`}>
              {wvCompleted}/{team.members.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">WV診断 完了</p>
          </div>
          <div className="text-center">
            <p className={`text-3xl font-bold ${ciCompleted === team.members.length && team.members.length > 0 ? "text-emerald-600" : "text-gray-900"}`}>
              {ciCompleted}/{team.members.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">CI診断 完了</p>
          </div>
        </div>
        {allDone && (
          <div className="mt-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 text-center">
            全メンバーの診断が完了しました
          </div>
        )}
      </div>

      {/* Team Radar Chart */}
      <TeamRadarChartSection
        memberScores={memberScores}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Members */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-bold text-gray-900">
            メンバー（{team.members.length}/30）
          </h2>
          {team.members.length < 30 && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer"
              style={{ backgroundColor: "#2979ff" }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 5v14M5 12h14" />
              </svg>
              メンバーを追加
            </button>
          )}
        </div>

        {showAddForm && (
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-5">
            <form onSubmit={handleAddMember} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  名前 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  maxLength={100}
                  placeholder="山田太郎"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2979ff] focus:ring-1 focus:ring-[#2979ff] outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  メール（任意）
                </label>
                <input
                  type="email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  maxLength={255}
                  placeholder="yamada@example.com"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#2979ff] focus:ring-1 focus:ring-[#2979ff] outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!memberName.trim() || adding}
                className="rounded-lg px-5 py-2 text-sm font-medium text-white disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: "#2979ff" }}
              >
                {adding ? "追加中..." : "追加"}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setError(""); }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                キャンセル
              </button>
            </form>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
        )}

        {team.members.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            メンバーがまだいません。「メンバーを追加」からメンバーを登録してください。
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {team.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-[#2979ff] shrink-0">
                    {member.name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                    {member.email && (
                      <p className="text-xs text-gray-400 truncate">{member.email}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggleAce(member.id, member.is_ace)}
                    className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                      member.is_ace
                        ? "text-yellow-500 hover:bg-yellow-50"
                        : "text-gray-300 hover:bg-gray-50 hover:text-yellow-400"
                    }`}
                    title={member.is_ace ? "エース解除" : "エースに設定"}
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill={member.is_ace ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </button>
                  <StatusBadge label="WV" status={member.wv_status} />
                  <StatusBadge label="CI" status={member.ci_status} />

                  <button
                    onClick={() => copyInviteUrl(member.invite_token)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    {copiedToken === member.invite_token ? (
                      <>
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={2}>
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        コピー済
                      </>
                    ) : (
                      <>
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        招待URL
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleRemoveMember(member.id, member.name)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
                    title="削除"
                  >
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ label, status }: { label: string; status: string }) {
  const done = status === "completed";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
        done
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-gray-100 text-gray-500 border border-gray-200"
      }`}
    >
      {done ? (
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
          <path d="M20 6L9 17l-5-5" />
        </svg>
      ) : (
        <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
          <circle cx={12} cy={12} r={6} />
        </svg>
      )}
      {label}
    </span>
  );
}

const WV_ORDER = ["achievement", "status", "autonomy", "safety", "altruism", "comfort"] as const;
const WV_FULL_LABELS: Record<string, string> = {
  achievement: "達成", status: "地位・名声", autonomy: "自主性", safety: "支援", altruism: "人間関係", comfort: "労働条件",
};

const CI_ORDER = ["R", "I", "A", "S", "E", "C"] as const;
const CI_FULL_LABELS: Record<string, string> = {
  R: "現実的", I: "研究的", A: "芸術的", S: "社会的", E: "企業的", C: "慣習的",
};

const MEMBER_COLORS = [
  "#2979ff", "#e91e63", "#ff9800", "#4caf50", "#9c27b0",
  "#00bcd4", "#ff5722", "#3f51b5", "#8bc34a", "#f44336",
  "#009688", "#ffc107", "#673ab7", "#03a9f4", "#cddc39",
  "#795548", "#607d8b", "#e040fb", "#76ff03", "#ff6e40",
  "#1a237e", "#880e4f", "#e65100", "#1b5e20", "#4a148c",
  "#006064", "#bf360c", "#283593", "#33691e", "#b71c1c",
];

const OUTLIER_WEIGHT = 0.15;
const ACE_WEIGHT = 1.8;
const WV_OUTLIER_THRESHOLD = 25;
const CI_OUTLIER_THRESHOLD = 1.0;
const MIN_MEMBERS_FOR_AVERAGE = 3;

function computeAvg(members: MemberScore[], key: "wv_scores" | "ci_scores", order: readonly string[]) {
  const completed = members.filter((m) => m[key] && m[key]!.length > 0);
  if (completed.length < MIN_MEMBERS_FOR_AVERAGE) return null;

  const threshold = key === "wv_scores" ? WV_OUTLIER_THRESHOLD : CI_OUTLIER_THRESHOLD;

  return order.map((id) => {
    const entries = completed
      .map((m) => ({ score: m[key]!.find((s) => s.id === id)?.display_score, isAce: m.is_ace }))
      .filter((e): e is { score: number; isAce: boolean } => e.score != null);
    if (entries.length === 0) return { id, score: 0 };

    const simpleAvg = entries.reduce((a, e) => a + e.score, 0) / entries.length;
    let weightedSum = 0;
    let weightTotal = 0;
    for (const e of entries) {
      let w: number;
      if (e.isAce) {
        w = ACE_WEIGHT;
      } else if (Math.abs(e.score - simpleAvg) > threshold) {
        w = OUTLIER_WEIGHT;
      } else {
        w = 1.0;
      }
      weightedSum += w * e.score;
      weightTotal += w;
    }
    return { id, score: weightedSum / weightTotal };
  });
}

function TeamRadarChartSection({
  memberScores,
  viewMode,
  onViewModeChange,
}: {
  memberScores: MemberScore[];
  viewMode: string;
  onViewModeChange: (v: string) => void;
}) {
  const wvCompleted = memberScores.filter((m) => m.wv_scores && m.wv_scores.length > 0);
  const ciCompleted = memberScores.filter((m) => m.ci_scores && m.ci_scores.length > 0);

  if (wvCompleted.length === 0 && ciCompleted.length === 0) return null;

  const wvAvg = useMemo(() => computeAvg(memberScores, "wv_scores", WV_ORDER), [memberScores]);
  const ciAvg = useMemo(() => computeAvg(memberScores, "ci_scores", CI_ORDER), [memberScores]);

  const isAverage = viewMode === "average";
  const selectedMember = !isAverage
    ? memberScores.find((m) => m.member_id === viewMode) || null
    : null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-gray-900">チーム診断チャート</h2>
        <select
          value={viewMode}
          onChange={(e) => onViewModeChange(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 bg-white focus:border-[#2979ff] focus:ring-1 focus:ring-[#2979ff] outline-none cursor-pointer"
        >
          <option value="average">チーム平均</option>
          {memberScores
            .filter((m) => (m.wv_scores && m.wv_scores.length > 0) || (m.ci_scores && m.ci_scores.length > 0))
            .map((m) => (
              <option key={m.member_id} value={m.member_id}>{m.member_name}</option>
            ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* WV Chart */}
        <div className="flex flex-col items-center pl-8">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Work Values（価値観）</h3>
          {isAverage ? (
            wvCompleted.length >= MIN_MEMBERS_FOR_AVERAGE ? (
              <SingleRadarChart
                scores={wvAvg}
                order={WV_ORDER as readonly string[]}
                fullLabels={WV_FULL_LABELS}
                isWV={true}
              />
            ) : (
              <div className="py-10 text-sm text-gray-400">
                {wvCompleted.length > 0
                  ? `${MIN_MEMBERS_FOR_AVERAGE}人以上の受検が必要です（現在${wvCompleted.length}人）`
                  : "データなし"}
              </div>
            )
          ) : selectedMember?.wv_scores && selectedMember.wv_scores.length > 0 ? (
            <SingleRadarChart
              scores={selectedMember.wv_scores.map((s) => ({ id: s.id, score: s.display_score }))}
              order={WV_ORDER as readonly string[]}
              fullLabels={WV_FULL_LABELS}
              isWV={true}
            />
          ) : (
            <div className="py-10 text-sm text-gray-400">未受検</div>
          )}
        </div>

        {/* CI Chart */}
        <div className="flex flex-col items-center pl-8">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Career Interest（興味）</h3>
          {isAverage ? (
            ciCompleted.length >= MIN_MEMBERS_FOR_AVERAGE ? (
              <SingleRadarChart
                scores={ciAvg}
                order={CI_ORDER as readonly string[]}
                fullLabels={CI_FULL_LABELS}
                isWV={false}
              />
            ) : (
              <div className="py-10 text-sm text-gray-400">
                {ciCompleted.length > 0
                  ? `${MIN_MEMBERS_FOR_AVERAGE}人以上の受検が必要です（現在${ciCompleted.length}人）`
                  : "データなし"}
              </div>
            )
          ) : selectedMember?.ci_scores && selectedMember.ci_scores.length > 0 ? (
            <SingleRadarChart
              scores={selectedMember.ci_scores.map((s) => ({ id: s.id, score: s.display_score }))}
              order={CI_ORDER as readonly string[]}
              fullLabels={CI_FULL_LABELS}
              isWV={false}
            />
          ) : (
            <div className="py-10 text-sm text-gray-400">未受検</div>
          )}
        </div>
      </div>
    </div>
  );
}

function SingleRadarChart({
  scores,
  order,
  fullLabels,
  isWV,
}: {
  scores: { id: string; score: number }[] | null;
  order: readonly string[];
  fullLabels: Record<string, string>;
  isWV: boolean;
}) {
  const cx = 175;
  const cy = 155;
  const R = 75;

  const hexPoint = (i: number, r: number) => {
    const angle = (Math.PI / 2) + (2 * Math.PI * i) / order.length;
    return { x: cx - Math.cos(angle) * r, y: cy - Math.sin(angle) * r };
  };

  const normalize = (score: number) => {
    if (isWV) return score / 100;
    return (score - 1) / 4;
  };

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPaths = gridLevels.map((level) => {
    const pts = order.map((_, i) => hexPoint(i, R * level));
    return pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";
  });
  const spokes = order.map((_, i) => hexPoint(i, R));

  const gridColor = isWV ? "#d0ddd6" : "#d0c0e0";
  const fillColor = isWV ? "rgba(61,139,110,0.18)" : "rgba(139,92,200,0.18)";
  const strokeColor = isWV ? "#5a9e82" : "#8B5CC8";
  const dotColor = isWV ? "#4a9474" : "#8B5CC8";
  const scoreTextColor = isWV ? "#2d7a5e" : "#6B3FA0";

  const scoreMap = new Map(scores?.map((s) => [s.id, s.score]) || []);
  const dataPoints = order.map((id, i) => {
    const val = normalize(scoreMap.get(id) || 0);
    return hexPoint(i, R * Math.max(val, 0.05));
  });
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ") + " Z";

  const labelPositions = order.map((id, i) => {
    const pt = hexPoint(i, R + 52);
    const angle = (Math.PI / 2) + (2 * Math.PI * i) / order.length;
    const cos = -Math.cos(angle);
    let anchor: "middle" | "start" | "end" = "middle";
    if (cos > 0.3) anchor = "start";
    else if (cos < -0.3) anchor = "end";
    return { id, x: pt.x, y: pt.y, anchor };
  });

  const w = 400;
  const h = 310;

  return (
    <svg width={w} height={h} className="shrink-0">
      {gridPaths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={gridColor} strokeWidth={0.6} />
      ))}
      {spokes.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={gridColor} strokeWidth={0.6} />
      ))}
      {scores && (
        <>
          <path d={dataPath} fill={fillColor} stroke={strokeColor} strokeWidth={1.5} />
          {dataPoints.map((pt, i) => (
            <circle key={i} cx={pt.x} cy={pt.y} r={3} fill={dotColor} />
          ))}
        </>
      )}
      {labelPositions.map((lp) => {
        const val = scoreMap.get(lp.id);
        const scoreStr = val != null
          ? (isWV ? val.toFixed(0) : val.toFixed(1))
          : "-";
        return (
          <g key={lp.id}>
            <text
              x={lp.x}
              y={lp.y - 9}
              textAnchor={lp.anchor}
              dominantBaseline="auto"
              fill="#444"
              fontSize={15}
              fontWeight="600"
            >
              {fullLabels[lp.id]}
            </text>
            <text
              x={lp.x}
              y={lp.y + 14}
              textAnchor={lp.anchor}
              dominantBaseline="auto"
              fill={scoreTextColor}
              fontSize={18}
              fontWeight="700"
            >
              {scoreStr}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
