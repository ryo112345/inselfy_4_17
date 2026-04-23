"use client";

import { useEffect, useState, useCallback } from "react";
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
  created_at: string;
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
  }, [fetchTeam]);

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
