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

type Phase = "empty" | "invite" | "in_progress" | "complete";

function detectPhase(members: Member[]): Phase {
  if (members.length === 0) return "empty";
  const wvDone = members.filter((m) => m.wv_status === "completed").length;
  const ciDone = members.filter((m) => m.ci_status === "completed").length;
  if (wvDone === members.length && ciDone === members.length) return "complete";
  if (wvDone === 0 && ciDone === 0) return "invite";
  return "in_progress";
}

const PHASE_CONFIG = {
  empty: {
    icon: (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#2979ff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
    title: "まずメンバーを追加しましょう",
    description: "チームメンバーを登録すると、一人ひとりに専用の診断URLが発行されます。",
    stepLabel: "ステップ 1/4",
    bg: "bg-blue-50/60",
    border: "border-blue-200",
  },
  invite: {
    icon: (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#2979ff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2L11 13" />
        <path d="M22 2l-7 20-4-9-9-4 20-7z" />
      </svg>
    ),
    title: "招待URLを送りましょう",
    description: "各メンバーの「招待URLをコピー」ボタンからURLを取得し、SlackやメールでURLを共有してください。",
    stepLabel: "ステップ 2/4",
    bg: "bg-blue-50/60",
    border: "border-blue-200",
  },
  in_progress: {
    icon: (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: "診断の回答を待っています",
    description: "まだ回答していないメンバーには、リマインドを送ってみましょう。",
    stepLabel: "ステップ 2/4",
    bg: "bg-amber-50/60",
    border: "border-amber-200",
  },
  complete: {
    icon: (
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    title: "セットアップが完了しました！",
    description: "チーム全体の傾向をレーダーチャートで確認できます。",
    stepLabel: "完了",
    bg: "bg-emerald-50/60",
    border: "border-emerald-200",
  },
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    try {
      await companyFetch(`/api/company/teams/${teamId}`, { method: "DELETE" });
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

  const phase = detectPhase(team.members);
  const config = PHASE_CONFIG[phase];
  const hasAce = team.members.some((m) => m.is_ace);
  const aceMember = team.members.find((m) => m.is_ace);
  const wvCompleted = team.members.filter((m) => m.wv_status === "completed").length;
  const ciCompleted = team.members.filter((m) => m.ci_status === "completed").length;
  const totalDiagnosis = team.members.length * 2;
  const completedDiagnosis = wvCompleted + ciCompleted;
  const progressPct = totalDiagnosis > 0 ? Math.round((completedDiagnosis / totalDiagnosis) * 100) : 0;

  return (
    <div>
      {/* Header */}
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
          {team.description && <p className="mt-1 text-base text-gray-500">{team.description}</p>}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
            className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
            title="チーム設定"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
            </svg>
          </button>
          {showDeleteConfirm && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-gray-200 bg-white shadow-lg z-10 py-1">
              <button
                onClick={handleDeleteTeam}
                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-2"
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                チームを削除
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Phase Guide Card */}
      <div className={`rounded-2xl ${config.bg} ${config.border} border p-6 mb-6`}>
        <div className="flex items-start gap-4">
          <div className="shrink-0 mt-0.5">{config.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-bold text-gray-900">{config.title}</h2>
              <span className="text-sm font-medium text-gray-500 bg-white/80 rounded-full px-2.5 py-0.5">
                {config.stepLabel}
              </span>
            </div>
            <p className="text-base text-gray-600">{config.description}</p>

            {/* Progress bar for in_progress & invite phases */}
            {team.members.length > 0 && phase !== "empty" && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-1.5">
                  <span>診断進捗</span>
                  <span className="font-medium">{completedDiagnosis}/{totalDiagnosis} 完了（{progressPct}%）</span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/80 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPct}%`,
                      backgroundColor: phase === "complete" ? "#10b981" : "#2979ff",
                    }}
                  />
                </div>
                <div className="mt-2 flex gap-4 text-sm text-gray-500">
                  <span>価値観診断: {wvCompleted}/{team.members.length}</span>
                  <span>職業興味診断: {ciCompleted}/{team.members.length}</span>
                </div>
              </div>
            )}

            {/* CTA for empty phase */}
            {phase === "empty" && (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors cursor-pointer hover:opacity-90"
                style={{ backgroundColor: "#2979ff" }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                メンバーを追加する
              </button>
            )}

          </div>
        </div>
      </div>

      {/* Workflow Steps */}
      {team.members.length > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-6">
          <StepCard
            number={1}
            title="メンバーを追加"
            description={`${team.members.length}人を登録済み`}
            done={true}
          />
          <StepCard
            number={2}
            title="招待URLを送信"
            description="各メンバーにURLを共有"
            done={phase === "in_progress" || phase === "complete"}
            active={phase === "invite"}
          />
          <StepCard
            number={3}
            title="診断結果を確認"
            description="全員完了後にチャート表示"
            done={phase === "complete"}
            active={false}
          />
          <StepCard
            number={4}
            title="理想の人材像を設定"
            description="マッチング精度UP"
            done={hasAce}
            active={!hasAce}
          />
        </div>
      )}

      {/* Radar Chart (prominent when complete) */}
      {phase === "complete" && (
        <TeamRadarChartSection
          memberScores={memberScores}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}

      {/* Members */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">
              メンバー
              <span className="ml-1.5 text-sm font-normal text-gray-400">
                {team.members.length}/30
              </span>
            </h2>
            <div className="flex items-center gap-3">
              {team.members.length > 0 && (
                <>
                  <span className="text-sm text-gray-500">理想の人材像:</span>
                  <select
                    value={aceMember?.id || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        handleToggleAce(val, false);
                      } else if (hasAce) {
                        handleToggleAce(aceMember!.id, true);
                      }
                    }}
                    className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 focus:border-[#2979ff] focus:ring-1 focus:ring-[#2979ff] outline-none cursor-pointer"
                  >
                    <option value="">未設定</option>
                    {team.members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </>
              )}
              {team.members.length < 30 && (
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: "#2979ff" }}
                >
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  メンバーを追加
                </button>
              )}
            </div>
          </div>
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
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
        )}

        {team.members.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            メンバーがまだいません。上の「メンバーを追加する」ボタンから登録してください。
          </div>
        ) : (
          <>
            {/* Column header */}
            <div className="grid items-center border-b border-gray-100 px-6 py-2 text-[13px] font-medium text-gray-400"
              style={{ gridTemplateColumns: "1fr 130px 130px 150px 40px" }}
            >
              <span>名前</span>
              <span className="text-center">価値観診断</span>
              <span className="text-center">職業興味診断</span>
              <span />
              <span />
            </div>
            <div className="divide-y divide-gray-50">
              {team.members.map((member) => {
                const wvDone = member.wv_status === "completed";
                const ciDone = member.ci_status === "completed";
                const allDone = wvDone && ciDone;

                return (
                  <div
                    key={member.id}
                    className="grid items-center px-6 py-3 transition-colors hover:bg-gray-50/60"
                    style={{ gridTemplateColumns: "1fr 130px 130px 150px 40px" }}
                  >
                    {/* Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full font-bold ${
                          allDone
                            ? "bg-emerald-50 text-emerald-600 text-[10px]"
                            : "bg-blue-50 text-[#2979ff] text-xs"
                        }`}>
                          {allDone ? "完了" : "未"}
                        </div>
                        {allDone && (
                          <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
                            <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5}>
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                        {member.email && (
                          <p className="text-xs text-gray-400 truncate">{member.email}</p>
                        )}
                      </div>
                    </div>

                    {/* WV Status */}
                    <div className="flex justify-center">
                      <DiagnosisStatus done={wvDone} />
                    </div>

                    {/* CI Status */}
                    <div className="flex justify-center">
                      <DiagnosisStatus done={ciDone} />
                    </div>

                    {/* Invite URL */}
                    <div className="flex justify-center">
                      <button
                        onClick={() => copyInviteUrl(member.invite_token)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                          copiedToken === member.invite_token
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : "bg-[#2979ff]/5 text-[#2979ff] border border-[#2979ff]/20 hover:bg-[#2979ff]/10"
                        }`}
                      >
                        {copiedToken === member.invite_token ? (
                          <>
                            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            コピー済
                          </>
                        ) : (
                          <>
                            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                            </svg>
                            招待URL
                          </>
                        )}
                      </button>
                    </div>

                    {/* Delete */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleRemoveMember(member.id, member.name)}
                        className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
                        title="削除"
                      >
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Radar Chart (below members for non-complete) */}
      {phase !== "complete" && phase !== "empty" && (
        <div className="mt-6">
          <TeamRadarChartSection
            memberScores={memberScores}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
      )}
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
  done,
  active,
}: {
  number: number;
  title: string;
  description: string;
  done: boolean;
  active?: boolean;
}) {
  return (
    <div className={`rounded-xl border px-3 py-3 transition-all ${
      done
        ? "border-emerald-200 bg-emerald-50/50"
        : active
        ? "border-[#2979ff]/30 bg-[#2979ff]/5"
        : "border-gray-200 bg-gray-50/50"
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          done
            ? "bg-emerald-500 text-white"
            : active
            ? "bg-[#2979ff] text-white"
            : "bg-gray-200 text-gray-500"
        }`}>
          {done ? (
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
              <path d="M20 6L9 17l-5-5" />
            </svg>
          ) : (
            number
          )}
        </div>
        <span className={`text-sm font-semibold ${
          done ? "text-emerald-700" : active ? "text-gray-900" : "text-gray-400"
        }`}>
          {title}
        </span>
      </div>
      <p className={`text-sm ml-8 ${done ? "text-emerald-600" : active ? "text-gray-500" : "text-gray-400"}`}>
        {description}
      </p>
    </div>
  );
}

function DiagnosisStatus({ done }: { done: boolean }) {
  return done ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700">
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
        <path d="M20 6L9 17l-5-5" />
      </svg>
      完了
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-xs text-gray-400">
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="6" />
      </svg>
      未受検
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

  const gridColor = isWV ? "#d8ede2" : "#e0d4f0";
  const fillColor = isWV ? "rgba(72,200,140,0.2)" : "rgba(160,120,220,0.2)";
  const strokeColor = isWV ? "#48c88c" : "#a878dc";
  const dotColor = isWV ? "#48c88c" : "#a878dc";
  const scoreTextColor = isWV ? "#2eb872" : "#9060d0";

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
          <path d={dataPath} fill={fillColor} stroke={strokeColor} strokeWidth={1.2} />
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
