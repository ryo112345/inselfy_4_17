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


const kpiData = {
  applicationToOffer: 18,
  avgLeadTimeDays: 32,
  monthlyApplications: [
    { month: "1月", count: 15 },
    { month: "2月", count: 22 },
    { month: "3月", count: 28 },
    { month: "4月", count: 19 },
  ],
  stageConversion: [
    { from: "応募", to: "書類通過", rate: 62 },
    { from: "書類通過", to: "一次面接", rate: 78 },
    { from: "一次面接", to: "最終面接", rate: 45 },
    { from: "最終面接", to: "内定", rate: 67 },
  ],
};

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


function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="h-2 w-full rounded-full bg-gray-100">
      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

const sectionIcons: Record<string, React.ReactNode> = {
  採用パイプライン: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M2 4.5A2.5 2.5 0 014.5 2h11A2.5 2.5 0 0118 4.5v2.062a2.5 2.5 0 01-.703 1.738l-4.844 4.844A2.5 2.5 0 0110.714 14H9.286a2.5 2.5 0 01-1.739-.856L2.703 8.3A2.5 2.5 0 012 6.562V4.5z" />
    </svg>
  ),
  要対応: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
  スカウト状況: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
      <path d="M19 8.839l-7.556 3.778a2.75 2.75 0 01-2.888 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
    </svg>
  ),
  求人パフォーマンス: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M1 2.75A.75.75 0 011.75 2h16.5a.75.75 0 010 1.5H17v12.136l.894.447a.75.75 0 01-.788 1.278l-1.591-.796a.75.75 0 01-.415-.67V3.5h-1.5v9.136l.894.447a.75.75 0 01-.788 1.278l-1.591-.796a.75.75 0 01-.415-.67V3.5H10v6.636l.894.447a.75.75 0 01-.788 1.278l-1.591-.796A.75.75 0 018.1 10.4V3.5H6.5v3.636l.894.447a.75.75 0 01-.788 1.278l-1.591-.796A.75.75 0 014.6 7.4V3.5H3v14.75a.75.75 0 01-1.5 0V3.5h-.75A.75.75 0 011 2.75z" clipRule="evenodd" />
    </svg>
  ),
  採用KPI: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
      <path d="M15.5 2A1.5 1.5 0 0014 3.5v13a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0016.5 2h-1zM9.5 6A1.5 1.5 0 008 7.5v9A1.5 1.5 0 009.5 18h1a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0010.5 6h-1zM3.5 10A1.5 1.5 0 002 11.5v5A1.5 1.5 0 003.5 18h1A1.5 1.5 0 006 16.5v-5A1.5 1.5 0 004.5 10h-1z" />
    </svg>
  ),
};

const stageIcons: Record<string, React.ReactNode> = {
  match: (
    <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
      <path d="M7 8a3 3 0 100-6 3 3 0 000 6zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM1.615 16.428a1.224 1.224 0 01-.569-1.175 6.002 6.002 0 0111.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 017 18a9.953 9.953 0 01-5.385-1.572zM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 00-1.588-3.755 4.502 4.502 0 015.874 2.636.818.818 0 01-.36.98A7.465 7.465 0 0114.5 16z" />
    </svg>
  ),
  scout: (
    <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
      <path d="M3 4a2 2 0 00-2 2v1.161l8.441 4.221a1.25 1.25 0 001.118 0L19 7.162V6a2 2 0 00-2-2H3z" />
      <path d="M19 8.839l-7.556 3.778a2.75 2.75 0 01-2.888 0L1 8.839V14a2 2 0 002 2h14a2 2 0 002-2V8.839z" />
    </svg>
  ),
  application: (
    <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M1 6a3 3 0 013-3h12a3 3 0 013 3v8a3 3 0 01-3 3H4a3 3 0 01-3-3V6zm4 1.5a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5A.75.75 0 015 7.5zm0 3a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5a.75.75 0 01-.75-.75zm0 3a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z" clipRule="evenodd" />
    </svg>
  ),
  interview: (
    <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
    </svg>
  ),
  offer: (
    <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
      <path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h6.572l-1.305 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-6.572l1.305-6.093z" />
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
                <div className="flex flex-1 flex-col items-center gap-1 py-6">
                  <span className="flex items-center gap-1.5 text-[13px] font-medium text-gray-500">
                    {stageIcons[stage.icon]}
                    {stage.label}
                  </span>
                  <span className="text-3xl font-bold text-gray-900" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
                    {stage.count}
                    <span className="ml-1 text-sm font-normal text-gray-400">{stage.unit}</span>
                  </span>
                  <Link
                    href={stage.href}
                    className="pipeline-action-btn mt-2 inline-flex items-center gap-1 rounded-full border border-[#2979ff]/30 bg-[#2979ff]/5 px-4 py-1.5 text-xs font-medium text-[#2979ff] transition-colors hover:bg-[#2979ff] hover:text-white"
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
        <section className="col-span-2">
          <SectionHeader title="要対応" />
          <div className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm">
            {actionItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center gap-2.5">
                  <UrgencyDot urgency={item.urgency} />
                  <div>
                    <p className="text-[13px] font-medium text-gray-900">{item.label}</p>
                    <p className="text-[11px] text-gray-400">{item.description}</p>
                  </div>
                </div>
                <span className="ml-2 text-lg font-bold" style={{ color: item.urgency === "high" ? "#ef4444" : accent }}>
                  {item.count}
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* スカウト状況 */}
        <section className="col-span-3">
          <SectionHeader title="スカウト状況" action="スカウト管理" href="/company/scout" />
          <div className="mt-3 rounded-2xl border border-gray-200 bg-white px-6 pb-6 pt-3 shadow-sm">
            {/* 送信可能 + 回収待ち（横並び） */}
            <div className="mb-5 grid grid-cols-2 gap-6">
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
                  補充: {scoutData.nextReplenishDate}（+{scoutData.monthlyAllowance}）→ {scoutData.balanceAfterReplenish}通
                </p>
              </div>
              <div>
                <p className="text-base font-semibold text-gray-700">回収待ち</p>
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
                {scoutData.pending.expiringSoon > 0 && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                    <span className="text-sm">⚠</span>
                    <p className="text-sm text-red-700">
                      <span className="font-semibold">{scoutData.pending.expiringSoon}通</span>が14日以内に期限切れ
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* スカウト成果（直近90日） */}
            <div className="border-t border-gray-100 pt-5">
              <p className="mb-3 text-base font-semibold text-gray-700">スカウト成果（直近90日）</p>
              <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-gray-100 px-4 py-3">
                <p className="text-xs font-medium text-gray-500">スカウト経由応募</p>
                <p className="mt-1.5 text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
                  {scoutData.last90d.applications}<span className="ml-0.5 text-sm font-normal text-gray-400">件</span>
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 px-4 py-3">
                <p className="text-xs font-medium text-gray-500">応募あたり送信数</p>
                <p className="mt-1.5 text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
                  {costPerApp ?? "—"}<span className="ml-0.5 text-sm font-normal text-gray-400">通/件</span>
                </p>
              </div>
              <div className="rounded-xl border border-gray-100 px-4 py-3">
                <p className="text-xs font-medium text-gray-500">返信率</p>
                <p className="mt-1.5 text-2xl font-bold text-gray-900" style={{ fontFamily: "var(--font-plus-jakarta-sans)" }}>
                  {scoutData.replyRate.current}<span className="ml-0.5 text-sm font-normal text-gray-400">%</span>
                </p>
              </div>
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

      {/* ── 採用KPI ── */}
      <section>
          <SectionHeader title="採用KPI" />
          <div className="mt-3 space-y-4">
            {/* サマリーカード */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-medium text-gray-400">応募→内定率</p>
                <p className="mt-1 text-2xl font-bold" style={{ color: accent }}>{kpiData.applicationToOffer}%</p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-medium text-gray-400">平均採用日数</p>
                <p className="mt-1 text-2xl font-bold" style={{ color: accent }}>{kpiData.avgLeadTimeDays}<span className="text-sm font-normal text-gray-400">日</span></p>
              </div>
            </div>

            {/* 月次応募推移 */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-[11px] font-medium text-gray-400">月次応募数</p>
              <div className="flex items-end gap-3">
                {kpiData.monthlyApplications.map((m) => {
                  const maxCount = Math.max(...kpiData.monthlyApplications.map((d) => d.count));
                  const h = Math.max(16, (m.count / maxCount) * 80);
                  return (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-xs font-medium text-gray-600">{m.count}</span>
                      <div className="w-full rounded-t-md" style={{ height: `${h}px`, backgroundColor: accent, opacity: 0.8 }} />
                      <span className="text-[10px] text-gray-400">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ステージ通過率 */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="mb-3 text-[11px] font-medium text-gray-400">ステージ通過率</p>
              <div className="space-y-3">
                {kpiData.stageConversion.map((s) => (
                  <div key={s.from}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{s.from} → {s.to}</span>
                      <span className="font-semibold" style={{ color: accent }}>{s.rate}%</span>
                    </div>
                    <div className="mt-1">
                      <MiniBar value={s.rate} max={100} color={accent} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
      </section>
    </div>
  );
}
