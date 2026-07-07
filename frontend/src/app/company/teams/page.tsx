"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCompanyAuth } from "@/features/company-auth/company-auth-context";

type Team = {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  wvCompleted: number;
  ciCompleted: number;
  createdAt: string;
};

export default function TeamsPage() {
  const { companyFetch } = useCompanyAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    companyFetch("/api/company/teams")
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setTeams(data.items ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [companyFetch]);

  const totalMembers = teams.reduce((s, t) => s + t.memberCount, 0);
  const totalWv = teams.reduce((s, t) => s + t.wvCompleted, 0);
  const totalCi = teams.reduce((s, t) => s + t.ciCompleted, 0);
  const totalDiag = totalMembers * 2;
  const completedDiag = totalWv + totalCi;
  const overallPct = totalDiag > 0 ? Math.round((completedDiag / totalDiag) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">チーム管理</h1>
        <Link
          href="/company/teams/new"
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
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
        <EmptyState />
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <SummaryCard
              icon={
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2979ff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              }
              label="チーム数"
              value={teams.length}
              unit="チーム"
            />
            <SummaryCard
              icon={
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#2979ff" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              }
              label="総メンバー数"
              value={totalMembers}
              unit="人"
            />
            <SummaryCard
              icon={
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={overallPct === 100 ? "#10b981" : "#2979ff"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              }
              label="診断完了率"
              value={totalDiag > 0 ? `${overallPct}%` : "-"}
              sub={totalDiag > 0 ? `${completedDiag}/${totalDiag} 完了` : undefined}
              highlight={overallPct === 100}
            />
          </div>

          {/* Team Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  unit,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  unit?: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className={`text-2xl font-bold ${highlight ? "text-emerald-600" : "text-gray-900"}`}
          style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
        >
          {value}
        </span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
      {sub && <p className="mt-1 text-sm text-gray-400">{sub}</p>}
    </div>
  );
}

function TeamCard({ team }: { team: Team }) {
  const wvPct = team.memberCount > 0 ? team.wvCompleted / team.memberCount : 0;
  const ciPct = team.memberCount > 0 ? team.ciCompleted / team.memberCount : 0;
  const allComplete = team.memberCount > 0 && wvPct === 1 && ciPct === 1;

  return (
    <Link
      href={`/company/teams/${team.id}`}
      className="group block rounded-2xl border border-gray-200 bg-white shadow-sm hover:border-blue-200 hover:shadow-md transition-all"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-gray-900 truncate group-hover:text-[#2979ff] transition-colors">
              {team.name}
            </h2>
          </div>
          <div className="shrink-0 ml-3 text-gray-300 group-hover:text-[#2979ff] transition-colors">
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-6">
          {/* Member Count */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#2979ff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">
                {team.memberCount}<span className="ml-0.5 text-sm font-normal text-gray-400">人</span>
              </p>
              <p className="text-sm text-gray-400">メンバー</p>
            </div>
          </div>

          <div className="h-8 w-px bg-gray-100" />

          {/* WV Progress Ring */}
          <div className="flex items-center gap-2.5">
            <ProgressRing
              value={wvPct}
              size={36}
              strokeWidth={3}
              color={wvPct === 1 ? "#10b981" : "#48c88c"}
              trackColor="#e5f5ed"
            />
            <div>
              <p className="text-base font-bold text-gray-900">
                {team.wvCompleted}/{team.memberCount}
              </p>
              <p className="text-sm text-gray-400">価値観診断</p>
            </div>
          </div>

          {/* CI Progress Ring */}
          <div className="flex items-center gap-2.5">
            <ProgressRing
              value={ciPct}
              size={36}
              strokeWidth={3}
              color={ciPct === 1 ? "#10b981" : "#a878dc"}
              trackColor="#f0e8f8"
            />
            <div>
              <p className="text-base font-bold text-gray-900">
                {team.ciCompleted}/{team.memberCount}
              </p>
              <p className="text-sm text-gray-400">興味診断</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
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
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={trackColor}
        strokeWidth={strokeWidth}
      />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
      {value === 1 && (
        <g transform={`rotate(90 ${center} ${center})`}>
          <polyline
            points={`${center - 4},${center} ${center - 1},${center + 3} ${center + 4},${center - 3}`}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-12 py-16 text-center">
        {/* Illustration */}
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-blue-50">
          <svg width={48} height={48} viewBox="0 0 48 48" fill="none">
            <circle cx="16" cy="16" r="6" stroke="#2979ff" strokeWidth={1.5} fill="none" />
            <path d="M8 34v-2a8 8 0 0116 0v2" stroke="#2979ff" strokeWidth={1.5} fill="none" strokeLinecap="round" />
            <circle cx="32" cy="16" r="6" stroke="#93bbff" strokeWidth={1.5} fill="none" />
            <path d="M24 34v-2a8 8 0 0116 0v2" stroke="#93bbff" strokeWidth={1.5} fill="none" strokeLinecap="round" />
            <path d="M34 10v8M30 14h8" stroke="#2979ff" strokeWidth={1.5} strokeLinecap="round" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">チームを作成して始めましょう</h2>
        <p className="text-sm text-gray-500 mb-2 max-w-md mx-auto">
          チームを作成し、メンバーに価値観診断・興味診断を受けてもらうことで、
          チームの傾向を可視化し、採用のミスマッチを防ぎます。
        </p>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-400 mb-8">
          <span className="flex items-center gap-1">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-[#2979ff]">1</span>
            チーム作成
          </span>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6" /></svg>
          <span className="flex items-center gap-1">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-[#2979ff]">2</span>
            メンバー追加
          </span>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6" /></svg>
          <span className="flex items-center gap-1">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-[#2979ff]">3</span>
            診断実施
          </span>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M9 18l6-6-6-6" /></svg>
          <span className="flex items-center gap-1">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-[#2979ff]">4</span>
            結果分析
          </span>
        </div>

        <Link
          href="/company/teams/new"
          className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: "#2979ff" }}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          最初のチームを作成
        </Link>
      </div>
    </div>
  );
}
