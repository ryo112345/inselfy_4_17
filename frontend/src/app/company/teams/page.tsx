"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCompanyAuth } from "@/features/company-auth/company-auth-context";

type Team = {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  wv_completed: number;
  ci_completed: number;
  created_at: string;
};

export default function TeamsPage() {
  const { companyFetch } = useCompanyAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    companyFetch("/api/company/teams")
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setTeams(data.teams ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [companyFetch]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">チーム管理</h1>
        <Link
          href="/company/teams/new"
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: "#2979ff" }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          チームを作成
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#2979ff]" />
        </div>
      ) : teams.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="#2979ff" strokeWidth={1.5}>
              <path d="M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-900 mb-1">チームがまだありません</p>
          <p className="text-sm text-gray-500 mb-6">
            チームを作成して、メンバーに診断を受けてもらいましょう
          </p>
          <Link
            href="/company/teams/new"
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white"
            style={{ backgroundColor: "#2979ff" }}
          >
            最初のチームを作成
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/company/teams/${team.id}`}
              className="block rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:border-blue-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{team.name}</h2>
                  {team.description && (
                    <p className="mt-1 text-sm text-gray-500">{team.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-400">
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
              <div className="mt-4 flex gap-6">
                <Stat label="メンバー" value={team.member_count} />
                <Stat
                  label="WV診断"
                  value={`${team.wv_completed}/${team.member_count}`}
                  done={team.member_count > 0 && team.wv_completed === team.member_count}
                />
                <Stat
                  label="CI診断"
                  value={`${team.ci_completed}/${team.member_count}`}
                  done={team.member_count > 0 && team.ci_completed === team.member_count}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, done }: { label: string; value: number | string; done?: boolean }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-bold ${done ? "text-emerald-600" : "text-gray-900"}`}>
        {value}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
