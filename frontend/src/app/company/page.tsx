import Link from "next/link";

const accent = "#2979ff";



const pipelineStages = [
  { label: "マッチ候補者", count: 12, unit: "人", href: "/company/talents", action: "候補者を見る", icon: "match" },
  { label: "スカウト送信", count: 5, unit: "件", href: "/company/scout", action: "スカウト管理", icon: "scout" },
  { label: "応募受付", count: 8, unit: "件", href: "/company/applications", action: "応募を確認", icon: "application" },
  { label: "面談確定", count: 3, unit: "件", href: "/company/applications?status=interview", action: "面談一覧", icon: "interview" },
  { label: "内定 / 目標", count: "7/10", unit: "人", href: "/company/applications?status=offer", action: "内定者一覧", icon: "offer" },
];

const actionItems = [
  { label: "未対応の応募", count: 3, urgency: "high", href: "/company/applications?status=new", description: "48時間以上未対応が1件" },
  { label: "未返信メッセージ", count: 2, urgency: "medium", href: "/company/messages?filter=unread", description: "最新: 田中様より (3時間前)" },
  { label: "選考結果の入力待ち", count: 4, urgency: "medium", href: "/company/applications?status=pending_result", description: "面談後3日以上が2件" },
  { label: "面接日程の確認待ち", count: 1, urgency: "low", href: "/company/applications?status=scheduling", description: "佐藤様 — 候補日回答済み" },
];

const scoutData = {
  balance: 42,
  cap: 120,
  monthlyAllowance: 30,
  nextReplenishDate: "5月1日",
  daysUntilReplenish: 9,
  balanceAfterReplenish: Math.min(42 + 30, 120),
  pending: {
    total: 23,
    expiringSoon: 5,
    byMonth: [
      { month: "2月", count: 5, daysLeft: 7 },
      { month: "3月", count: 8, daysLeft: 38 },
      { month: "4月", count: 10, daysLeft: 68 },
    ],
  },
  replyRate: { current: 62, prev: 55 },
  avgReplyDays: 12,
  last90d: { sent: 58, applications: 12 },
};

const jobs = [
  { title: "バックエンドエンジニア", status: "公開中", applicants: 12, views: 340, daysLeft: 28, href: "/company/jobs/1" },
  { title: "フロントエンドエンジニア", status: "公開中", applicants: 8, views: 280, daysLeft: 7, href: "/company/jobs/2" },
  { title: "プロダクトマネージャー", status: "公開中", applicants: 5, views: 190, daysLeft: 45, href: "/company/jobs/3" },
  { title: "デザイナー", status: "下書き", applicants: 0, views: 0, daysLeft: null, href: "/company/jobs/4" },
];


function PipelineArrow() {
  return (
    <div className="flex shrink-0 items-center px-1">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M7 4l6 6-6 6" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function UrgencyDot({ urgency }: { urgency: string }) {
  const colors = {
    high: "bg-red-500",
    medium: "bg-amber-400",
    low: "bg-emerald-400",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[urgency as keyof typeof colors]}`} />;
}



const sectionIcons: Record<string, React.ReactNode> = {
  採用パイプライン: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" />
      <path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11.05A22 22 0 0112 15z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  ),
  要対応: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
  スカウト状況: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  ),
  求人パフォーマンス: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M1 2.75A.75.75 0 011.75 2h16.5a.75.75 0 010 1.5H17v12.136l.894.447a.75.75 0 01-.788 1.278l-1.591-.796a.75.75 0 01-.415-.67V3.5h-1.5v9.136l.894.447a.75.75 0 01-.788 1.278l-1.591-.796a.75.75 0 01-.415-.67V3.5H10v6.636l.894.447a.75.75 0 01-.788 1.278l-1.591-.796A.75.75 0 018.1 10.4V3.5H6.5v3.636l.894.447a.75.75 0 01-.788 1.278l-1.591-.796A.75.75 0 014.6 7.4V3.5H3v14.75a.75.75 0 01-1.5 0V3.5h-.75A.75.75 0 011 2.75z" clipRule="evenodd" />
    </svg>
  ),
};

const stageIcons: Record<string, React.ReactNode> = {
  match: (
    <svg className="h-4.5 w-4.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8l2 2 4-4" />
    </svg>
  ),
  scout: (
    <svg className="h-4.5 w-4.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  ),
  application: (
    <svg className="h-4.5 w-4.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  interview: (
    <svg className="h-4.5 w-4.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  offer: (
    <svg className="h-4.5 w-4.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
  const balancePct = Math.round((scoutData.balance / scoutData.cap) * 100);
  const costPerApp = scoutData.last90d.applications > 0
    ? Math.round((scoutData.last90d.sent / scoutData.last90d.applications) * 10) / 10
    : null;

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
                  <span className="text-3xl font-bold text-gray-900" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
                    {stage.count}
                    <span className="ml-1 text-sm font-normal text-gray-400">{stage.unit}</span>
                  </span>
                  <Link
                    href={stage.href}
                    className="pipeline-action-btn mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#2979ff]/30 bg-[#2979ff]/5 px-5 py-2 text-sm font-medium text-[#2979ff] transition-colors hover:bg-[#2979ff] hover:text-white"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        {/* 要対応アイテム */}
        <section className="col-span-2 flex flex-col">
          <SectionHeader title="要対応" />
          <div className="mt-3 flex flex-1 flex-col divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm">
            {actionItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-2.5">
                  <UrgencyDot urgency={item.urgency} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-400">{item.description}</p>
                  </div>
                </div>
                <span className="ml-2 text-lg font-bold text-gray-900">
                  {item.count}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* スカウト状況 */}
        <section className="col-span-3">
          <SectionHeader title="スカウト状況" action="スカウト管理" href="/company/scout" />
          <div className="mt-3 rounded-2xl border border-gray-200 bg-white px-6 pb-0 pt-3 shadow-sm">
            {/* 送信可能 + 返信待ち（横並び） */}
            <div className="mb-3 grid grid-cols-2 gap-6">
              <div>
                <p className="text-base font-semibold text-gray-700">送信可能</p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-3xl font-bold" style={{ color: accent, fontFamily: "var(--font-plus-jakarta-sans)" }}>{scoutData.balance}</span>
                  <span className="text-sm font-normal text-gray-400">/ <span style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>{scoutData.cap}</span></span>
                </div>
                <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-3 rounded-full transition-all"
                    style={{ width: `${balancePct}%`, backgroundColor: accent }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-400">
                  補充: {scoutData.nextReplenishDate}（+{scoutData.monthlyAllowance}通 / 上限{scoutData.cap}通）
                </p>
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <p className="mb-2.5 text-base font-semibold text-gray-700">スカウト成果（直近90日）</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">スカウト経由応募</span>
                      <span className="font-medium text-gray-700"><span className="text-lg font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>{scoutData.last90d.applications}</span> 件</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">応募あたり送信数</span>
                      <span className="font-medium text-gray-700"><span className="text-lg font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>{costPerApp ?? "—"}</span> 通/件</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">返信率</span>
                      <span className="font-medium text-gray-700"><span className="text-lg font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>{scoutData.replyRate.current}</span> %</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-base font-semibold text-gray-700">返信待ち</p>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>{scoutData.pending.total}</span>
                  <span className="text-sm font-normal text-gray-400">通</span>
                </div>
                <div className="mt-2.5 space-y-2">
                  {scoutData.pending.byMonth.map((m) => (
                    <div key={m.month} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{m.month}送信分</span>
                      <span className="flex items-center gap-2.5">
                        <span className="font-medium text-gray-700"><span className="text-lg font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>{m.count}</span> 通</span>
                        <span className={m.daysLeft <= 14 ? "font-semibold text-red-500" : "text-gray-400"}>
                          残 <span className="text-lg font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>{m.daysLeft}</span> 日
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-500">平均返信日数</span>
                  <span className="font-medium text-gray-700"><span className="text-lg font-bold" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>{scoutData.avgReplyDays}</span> 日</span>
                </div>
                <Link
                  href="/company/scout?status=pending"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#2979ff]/30 bg-[#2979ff]/5 px-5 py-2 text-sm font-medium text-[#2979ff] transition-colors hover:bg-[#2979ff] hover:text-white"
                >
                  <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4.5 2.5l3.5 3.5-3.5 3.5" />
                  </svg>
                  返信待ちスカウト一覧を見る
                </Link>
              </div>
            </div>
          </div>
        </section>
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
                      <Link href={job.href} className="font-medium text-gray-900 hover:underline" style={{ textDecorationColor: accent }}>
                        {job.title}
                      </Link>
                    </td>
                    <td className="px-2 py-3.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          job.status === "公開中"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-2 py-3.5 text-right text-gray-600">{job.views > 0 ? job.views.toLocaleString() : "—"}</td>
                    <td className="px-2 py-3.5 text-right font-medium text-gray-900">{job.applicants}</td>
                    <td className="px-2 py-3.5 text-right text-gray-600">{rate}{rate !== "—" ? "%" : ""}</td>
                    <td className={`py-3.5 pl-2 pr-5 text-right ${isUrgent ? "font-semibold text-red-500" : "text-gray-600"}`}>
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
