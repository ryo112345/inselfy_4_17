import Link from "next/link";
import { ActionItemsSection } from "./ActionItemsSection";
import { ScoutSection } from "./ScoutSection";

const accent = "#2979ff";

const pipelineStages = [
  {
    label: "マッチ候補者",
    count: 12,
    unit: "人",
    href: "/company/talents",
    action: "候補者を見る",
    icon: "match",
  },
  {
    label: "スカウト送信",
    count: 5,
    unit: "件",
    href: "/company/scout",
    action: "スカウト管理",
    icon: "scout",
  },
  {
    label: "応募受付",
    count: 8,
    unit: "件",
    href: "/company/applications",
    action: "応募を確認",
    icon: "application",
  },
  {
    label: "面談確定",
    count: 3,
    unit: "件",
    href: "/company/applications?status=interview",
    action: "面談一覧",
    icon: "interview",
  },
  {
    label: "内定 / 目標",
    count: "7/10",
    unit: "人",
    href: "/company/applications?status=offer",
    action: "内定者一覧",
    icon: "offer",
  },
];

const jobs = [
  {
    title: "バックエンドエンジニア",
    status: "公開中",
    applicants: 12,
    views: 340,
    daysLeft: 28,
    href: "/company/jobs/1",
  },
  {
    title: "フロントエンドエンジニア",
    status: "公開中",
    applicants: 8,
    views: 280,
    daysLeft: 7,
    href: "/company/jobs/2",
  },
  {
    title: "プロダクトマネージャー",
    status: "公開中",
    applicants: 5,
    views: 190,
    daysLeft: 45,
    href: "/company/jobs/3",
  },
  {
    title: "デザイナー",
    status: "下書き",
    applicants: 0,
    views: 0,
    daysLeft: null,
    href: "/company/jobs/4",
  },
];

function PipelineArrow() {
  return (
    <div className="flex shrink-0 items-center px-1">
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M7 4l6 6-6 6"
          stroke="#cbd5e1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

const sectionIcons: Record<string, React.ReactNode> = {
  採用パイプライン: (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11.05A22 22 0 0112 15z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  ),
  要対応: (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="6" width="15" height="15" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 14l3 3L22 5" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  ),
  スカウト状況: (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  ),
  求人パフォーマンス: (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 20L9 13l4 4L21 7" stroke="currentColor" strokeWidth="2.5" />
      <path d="M17 7h4v4" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
};

const stageIcons: Record<string, React.ReactNode> = {
  match: (
    <svg
      aria-hidden="true"
      className="h-4.5 w-4.5 text-blue-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8l2 2 4-4" />
    </svg>
  ),
  scout: (
    <svg
      aria-hidden="true"
      className="h-4.5 w-4.5 text-blue-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  ),
  application: (
    <svg
      aria-hidden="true"
      className="h-4.5 w-4.5 text-blue-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  interview: (
    <svg
      aria-hidden="true"
      className="h-4.5 w-4.5 text-blue-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  offer: (
    <svg
      aria-hidden="true"
      className="h-4.5 w-4.5 text-blue-500"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
};

function SectionHeader({ title, action, href }: { title: string; action?: string; href?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-gray-500">
        {sectionIcons[title]}
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {action && href && (
        <Link href={href} className="text-xs font-medium hover:underline" style={{ color: accent }}>
          {action} →
        </Link>
      )}
    </div>
  );
}

export default function CompanyPage() {
  return (
    <div className="space-y-6">
      {/* ── 採用パイプライン ── */}
      <section>
        <SectionHeader title="採用パイプライン" />
        <div className="mt-3 rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center">
            {pipelineStages.map((stage, i) => (
              <div key={stage.label} className="flex flex-1 items-center">
                <div className="flex flex-1 flex-col items-center gap-2 pt-5 pb-6 pl-4">
                  <span className="flex items-center gap-1.5 text-base font-medium text-gray-500 -ml-5">
                    {stageIcons[stage.icon]}
                    {stage.label}
                  </span>
                  <span
                    className="text-3xl font-bold text-gray-900"
                    style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}
                  >
                    {stage.count}
                    <span className="ml-1 text-sm font-normal text-gray-400">{stage.unit}</span>
                  </span>
                  <Link
                    href={stage.href}
                    className="pipeline-action-btn mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#2979ff]/30 bg-[#2979ff]/5 px-5 py-2 text-sm font-medium text-[#2979ff] transition-colors hover:bg-[#2979ff] hover:text-white"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-3 w-3"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4.5 2.5l3.5 3.5-3.5 3.5" />
                    </svg>
                    {stage.action}
                  </Link>
                </div>
                {i < pipelineStages.length - 1 && <PipelineArrow />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 要対応 + スカウト (2カラム) ── */}
      <div className="grid grid-cols-5 gap-5">
        <ActionItemsSection />

        <ScoutSection />
      </div>

      {/* ── 求人パフォーマンス ── */}
      <section>
        <SectionHeader title="求人パフォーマンス" action="求人一覧" href="/company/jobs" />
        <div className="mt-3 rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-medium text-gray-400">
                <th className="py-3 pl-5 pr-2 font-medium">求人タイトル</th>
                <th className="px-2 py-3 font-medium">ステータス</th>
                <th className="px-2 py-3 text-right font-medium">PV</th>
                <th className="px-2 py-3 text-right font-medium">応募数</th>
                <th className="px-2 py-3 text-right font-medium">応募率</th>
                <th className="py-3 pl-2 pr-5 text-right font-medium">掲載残日数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {jobs.map((job) => {
                const rate = job.views > 0 ? ((job.applicants / job.views) * 100).toFixed(1) : "—";
                const isUrgent = job.daysLeft !== null && job.daysLeft <= 7;
                return (
                  <tr key={job.title} className="transition-colors hover:bg-gray-50">
                    <td className="py-3.5 pl-5 pr-2">
                      <Link
                        href={job.href}
                        className="text-base font-medium text-gray-900 hover:underline"
                        style={{ textDecorationColor: accent }}
                      >
                        {job.title}
                      </Link>
                    </td>
                    <td className="px-2 py-3.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-medium ${
                          job.status === "公開中"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-2 py-3.5 text-right text-base text-gray-600">
                      {job.views > 0 ? job.views.toLocaleString() : "—"}
                    </td>
                    <td className="px-2 py-3.5 text-right text-base font-medium text-gray-900">
                      {job.applicants}
                    </td>
                    <td className="px-2 py-3.5 text-right text-base text-gray-600">
                      {rate}
                      {rate !== "—" ? "%" : ""}
                    </td>
                    <td
                      className={`py-3.5 pl-2 pr-5 text-right text-base ${isUrgent ? "font-semibold text-red-500" : "text-gray-600"}`}
                    >
                      {job.daysLeft !== null ? `${job.daysLeft}日` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
