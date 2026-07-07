"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCompanyAuth } from "@/features/company-auth/company-auth-context";
import {
  SingleRadarChart,
  WV_ORDER, WV_FULL_LABELS,
  CI_ORDER, CI_FULL_LABELS,
} from "@/app/components/SingleRadarChart";

type Member = {
  id: string;
  name: string;
  email: string | null;
  inviteToken: string;
  wvStatus: string;
  ciStatus: string;
  isAce: boolean;
  createdAt: string;
};

type Score = {
  id: string;
  displayScore: number;
  rank: number;
};

type MemberScore = {
  memberId: string;
  memberName: string;
  wvStatus: string;
  ciStatus: string;
  isAce: boolean;
  wvScores: Score[] | null;
  ciScores: Score[] | null;
};

type TeamDetail = {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  members: Member[];
  createdAt: string;
};

type Phase = "empty" | "invite" | "in_progress" | "complete";

function detectPhase(members: Member[]): Phase {
  if (members.length === 0) return "empty";
  const wvDone = members.filter((m) => m.wvStatus === "completed").length;
  const ciDone = members.filter((m) => m.ciStatus === "completed").length;
  if (wvDone === members.length && ciDone === members.length) return "complete";
  if (wvDone === 0 && ciDone === 0) return "invite";
  return "in_progress";
}

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
      setMemberScores(data.items || []);
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

  const handleTogglePublic = async () => {
    if (!team) return;
    try {
      await companyFetch(`/api/company/teams/${teamId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: team.name,
          description: team.description,
          isPublic: !team.isPublic,
        }),
      });
      await fetchTeam();
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
  const hasAce = team.members.some((m) => m.isAce);
  const aceMember = team.members.find((m) => m.isAce);
  const wvCompleted = team.members.filter((m) => m.wvStatus === "completed").length;
  const ciCompleted = team.members.filter((m) => m.ciStatus === "completed").length;

  return (
    <div>
      {/* Header */}
      <Link
        href="/company/teams"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
        チーム一覧
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
          {team.description && <p className="mt-1 text-sm text-gray-500">{team.description}</p>}
          <button
            onClick={handleTogglePublic}
            className="mt-2 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
          >
            <div className={`relative h-5 w-9 rounded-full transition-colors ${team.isPublic ? "bg-emerald-500" : "bg-gray-300"}`}>
              <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${team.isPublic ? "translate-x-4" : "translate-x-0.5"}`} />
            </div>
            <span>企業ページに公開</span>
          </button>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
            className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
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
                </svg>
                チームを削除
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Phase Banner with inline progress */}
      <PhaseBanner
        phase={phase}
        onAddMember={() => setShowAddForm(true)}
        memberCount={team.members.length}
        wvCompleted={wvCompleted}
        ciCompleted={ciCompleted}
      />

      {/* Radar Chart + Ace Member */}
      <TeamRadarChartSection
        memberScores={memberScores}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        members={team.members}
        aceMember={aceMember ?? null}
        onSetAce={(id) => handleToggleAce(id, false)}
        onClearAce={() => aceMember && handleToggleAce(aceMember.id, true)}
      />

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

        {showAddForm && (
          <div className="border-b border-gray-100 bg-gray-50 px-6 py-5">
            <form onSubmit={handleAddMember} className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 mb-1">
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
                <label className="block text-sm font-medium text-gray-600 mb-1">
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
          <div className="px-6 py-12 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#2979ff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">メンバーがまだいません</p>
            <p className="text-sm text-gray-500">メンバーを追加して診断URLを発行しましょう</p>
          </div>
        ) : (
          <>
            {/* Column header */}
            <div
              className="grid items-center border-b border-gray-100 px-6 py-2.5 text-sm font-medium text-gray-400"
              style={{ gridTemplateColumns: "1fr 120px 120px 140px 40px" }}
            >
              <span>名前</span>
              <span className="text-center">価値観診断</span>
              <span className="text-center">興味診断</span>
              <span className="text-center">招待URL</span>
              <span />
            </div>
            <div className="divide-y divide-gray-50">
              {team.members.map((member) => {
                const wvDone = member.wvStatus === "completed";
                const ciDone = member.ciStatus === "completed";

                return (
                  <div
                    key={member.id}
                    className={`grid items-center px-6 py-3 transition-colors hover:bg-gray-50/60 ${
                      member.isAce ? "bg-amber-50/30" : ""
                    }`}
                    style={{ gridTemplateColumns: "1fr 120px 120px 140px 40px" }}
                  >
                    {/* Name + Ace */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                          member.isAce
                            ? "bg-amber-100 text-amber-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {member.name.charAt(0)}
                        </div>
                        {member.isAce && (
                          <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 ring-2 ring-white">
                            <svg width={8} height={8} viewBox="0 0 24 24" fill="white" stroke="none">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                          {member.isAce && (
                            <span className="shrink-0 text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                              理想の人材像
                            </span>
                          )}
                        </div>
                        {member.email && (
                          <p className="text-sm text-gray-400 truncate">{member.email}</p>
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
                        onClick={(e) => { e.stopPropagation(); copyInviteUrl(member.inviteToken); }}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all cursor-pointer ${
                          copiedToken === member.inviteToken
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : "bg-[#2979ff]/5 text-[#2979ff] border border-[#2979ff]/20 hover:bg-[#2979ff]/10"
                        }`}
                      >
                        {copiedToken === member.inviteToken ? (
                          <>
                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                            コピー済
                          </>
                        ) : (
                          <>
                            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                            </svg>
                            招待URL
                          </>
                        )}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end">
                      <MemberMenu
                        member={member}
                        onToggleAce={() => handleToggleAce(member.id, member.isAce)}
                        onRemove={() => handleRemoveMember(member.id, member.name)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MemberMenu({
  member,
  onToggleAce,
  onRemove,
}: {
  member: Member;
  onToggleAce: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-1.5 text-gray-300 hover:bg-gray-100 hover:text-gray-500 transition-colors cursor-pointer"
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-gray-200 bg-white shadow-lg z-20 py-1">
            <button
              onClick={() => { onToggleAce(); setOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill={member.isAce ? "#f59e0b" : "none"} stroke={member.isAce ? "#f59e0b" : "currentColor"} strokeWidth={1.5}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {member.isAce ? "理想の人材像を解除" : "理想の人材像に設定"}
            </button>
            <button
              onClick={() => { onRemove(); setOpen(false); }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex items-center gap-2"
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              メンバーを削除
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function PhaseBanner({
  phase,
  onAddMember,
  memberCount,
  wvCompleted,
  ciCompleted,
}: {
  phase: Phase;
  onAddMember: () => void;
  memberCount: number;
  wvCompleted: number;
  ciCompleted: number;
}) {
  if (phase === "empty") {
    return (
      <div className="rounded-xl bg-blue-50/60 border border-blue-200 px-5 py-3.5 mb-6 flex items-center gap-3">
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2979ff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
        <p className="text-sm text-blue-900 flex-1">まずメンバーを追加しましょう。登録すると一人ひとりに専用の診断URLが発行されます。</p>
        <button
          onClick={onAddMember}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white cursor-pointer hover:opacity-90"
          style={{ backgroundColor: "#2979ff" }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          メンバーを追加
        </button>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="rounded-xl bg-emerald-50/60 border border-emerald-200 px-5 py-3 mb-6 flex items-center gap-3">
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <p className="text-sm text-emerald-800">
          <span className="font-medium">{memberCount}人</span>全員の診断が完了しました
        </p>
      </div>
    );
  }

  const isInvite = phase === "invite";
  const bg = isInvite ? "bg-blue-50/60" : "bg-amber-50/60";
  const border = isInvite ? "border-blue-200" : "border-amber-200";
  const textColor = isInvite ? "text-blue-900" : "text-amber-900";
  const message = isInvite
    ? "各メンバーの「招待URL」をコピーして、SlackやメールでURLを共有してください。"
    : "診断の回答を待っています。まだ回答していないメンバーにはリマインドを送りましょう。";

  return (
    <div className={`rounded-xl ${bg} ${border} border px-5 py-3.5 mb-6`}>
      <div className="flex items-center gap-3">
        {isInvite ? (
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2979ff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        ) : (
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        )}
        <p className={`text-sm ${textColor} flex-1`}>{message}</p>
        {memberCount > 0 && (
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <ProgressRing value={wvCompleted / memberCount} size={20} strokeWidth={2} color={wvCompleted === memberCount ? "#10b981" : "#48c88c"} trackColor="#e5f5ed" />
              <span className="text-sm text-gray-600">価値観 <span className="font-medium">{wvCompleted}/{memberCount}</span></span>
            </div>
            <div className="flex items-center gap-1.5">
              <ProgressRing value={ciCompleted / memberCount} size={20} strokeWidth={2} color={ciCompleted === memberCount ? "#10b981" : "#a878dc"} trackColor="#f0e8f8" />
              <span className="text-sm text-gray-600">興味 <span className="font-medium">{ciCompleted}/{memberCount}</span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgressRing({
  value,
  size,
  strokeWidth,
  color,
  trackColor,
}: {
  value: number;
  size: number;
  strokeWidth: number;
  color: string;
  trackColor: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value);
  const center = size / 2;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
      <circle
        cx={center} cy={center} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        className="transition-all duration-500"
      />
      {value === 1 && (
        <g transform={`rotate(90 ${center} ${center})`}>
          <polyline
            points={`${center - 4},${center} ${center - 1},${center + 3} ${center + 4},${center - 3}`}
            fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
}

function DiagnosisStatus({ done }: { done: boolean }) {
  return done ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-sm font-medium text-emerald-700">
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
        <path d="M20 6L9 17l-5-5" />
      </svg>
      完了
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 border border-gray-200 px-3 py-1 text-sm text-gray-400">
      <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="6" />
      </svg>
      未受検
    </span>
  );
}


const OUTLIER_WEIGHT = 0.15;
const ACE_WEIGHT = 1.8;
const WV_OUTLIER_THRESHOLD = 25;
const CI_OUTLIER_THRESHOLD = 1.0;
const MIN_MEMBERS_FOR_AVERAGE = 3;

function computeAvg(members: MemberScore[], key: "wvScores" | "ciScores", order: readonly string[]) {
  const completed = members.filter((m) => m[key] && m[key]!.length > 0);
  if (completed.length < MIN_MEMBERS_FOR_AVERAGE) return null;

  const threshold = key === "wvScores" ? WV_OUTLIER_THRESHOLD : CI_OUTLIER_THRESHOLD;

  return order.map((id) => {
    const entries = completed
      .map((m) => ({ score: m[key]!.find((s) => s.id === id)?.displayScore, isAce: m.isAce }))
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
  members,
  aceMember,
  onSetAce,
  onClearAce,
}: {
  memberScores: MemberScore[];
  viewMode: string;
  onViewModeChange: (v: string) => void;
  members: Member[];
  aceMember: Member | null;
  onSetAce: (memberId: string) => void;
  onClearAce: () => void;
}) {
  const wvCompleted = memberScores.filter((m) => m.wvScores && m.wvScores.length > 0);
  const ciCompleted = memberScores.filter((m) => m.ciScores && m.ciScores.length > 0);

  if (wvCompleted.length === 0 && ciCompleted.length === 0) return null;

  const wvAvg = useMemo(() => computeAvg(memberScores, "wvScores", WV_ORDER), [memberScores]);
  const ciAvg = useMemo(() => computeAvg(memberScores, "ciScores", CI_ORDER), [memberScores]);

  const isAverage = viewMode === "average";
  const selectedMember = !isAverage
    ? memberScores.find((m) => m.memberId === viewMode) || null
    : null;

  const completedMembers = members.filter(
    (m) => m.wvStatus === "completed" && m.ciStatus === "completed"
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-gray-900">チーム診断チャート</h2>
        <div className="flex items-center gap-3">
          {/* Ace member — inline next to view selector */}
          {isAverage && completedMembers.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <svg width={14} height={14} viewBox="0 0 24 24" fill={aceMember ? "#f59e0b" : "none"} stroke={aceMember ? "#f59e0b" : "#9ca3af"} strokeWidth={1.5}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-sm text-gray-500">理想の人材像</span>
                <div className="relative group">
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="cursor-help">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
                    <circle cx="12" cy="17" r="0.5" fill="#9ca3af" />
                  </svg>
                  <div className="absolute bottom-full right-0 mb-2 w-64 rounded-lg bg-gray-800 px-3 py-2 text-xs text-white opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10">
                    活躍しているメンバーを設定すると、その人の診断傾向がチーム平均に強く反映され、採用マッチングの精度が上がります。
                    <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-800" />
                  </div>
                </div>
              </div>
              {aceMember ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-700">{aceMember.name}</span>
                  <button
                    onClick={onClearAce}
                    className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    解除
                  </button>
                </div>
              ) : (
                <select
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) onSetAce(e.target.value); }}
                  className="rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-sm text-gray-700 focus:border-[#2979ff] focus:ring-1 focus:ring-[#2979ff] outline-none cursor-pointer"
                >
                  <option value="" disabled>選択</option>
                  {completedMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              )}
              <div className="w-px h-5 bg-gray-200" />
            </div>
          )}
          <select
            value={viewMode}
            onChange={(e) => onViewModeChange(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 bg-white focus:border-[#2979ff] focus:ring-1 focus:ring-[#2979ff] outline-none cursor-pointer"
          >
            <option value="average">チーム平均</option>
            {memberScores
              .filter((m) => (m.wvScores && m.wvScores.length > 0) || (m.ciScores && m.ciScores.length > 0))
              .map((m) => (
                <option key={m.memberId} value={m.memberId}>{m.memberName}</option>
              ))}
          </select>
        </div>
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
          ) : selectedMember?.wvScores && selectedMember.wvScores.length > 0 ? (
            <SingleRadarChart
              scores={selectedMember.wvScores.map((s) => ({ id: s.id, score: s.displayScore }))}
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
          ) : selectedMember?.ciScores && selectedMember.ciScores.length > 0 ? (
            <SingleRadarChart
              scores={selectedMember.ciScores.map((s) => ({ id: s.id, score: s.displayScore }))}
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

