import Link from "next/link";

const cardClass =
  "rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]";

const ACCENT = "#3D8B6E";

const MOCK = {
  company: {
    id: "afd20f1c-b6a8-4809-bc8f-b3f41263b511",
    name: "inselfy株式会社",
    logoUrl: "",
    industry: "HRテック",
    location: "東京都渋谷区",
    employeeCount: "10〜30名",
  },
  job: {
    title:
      "バックエンドエンジニア｜Go / PostgreSQL / AWS でプロダクト基盤を設計",
    jobCategory: "エンジニア",
    employmentType: "正社員",
    hiringCount: "1〜2名",
    description:
      "inselfyの価値観マッチングエンジンを支えるAPI基盤の設計・開発をリードしていただきます。Bradley-Terryモデルによるスコアリング、pgvectorを活用したベクトル検索、リアルタイム推薦アルゴリズムなど、データと密接に結びついたバックエンド開発が中心です。",
    appealPoints:
      "独自の価値観診断アルゴリズムとマッチングエンジンの開発に携われます。少人数チームのため、技術選定からアーキテクチャ設計まで裁量を持って取り組める環境です。フルリモート・フルフレックスで、自律的に働ける文化を大切にしています。",
    challenges:
      "急成長フェーズのプロダクトで、スケーラビリティとパフォーマンスの両立が求められます。統計モデルの実装やベクトル検索の最適化など、一般的なCRUD開発とは異なる技術的チャレンジがあります。",
    teamDescription:
      "現在エンジニア5名のチームで、全員がフルスタック志向を持ちながらもバックエンドに強みを持つメンバーが揃っています。コードレビューを重視し、技術的な議論を日常的に行うカルチャーです。",
    skillsGained:
      "Go言語での大規模API設計スキル、統計モデルの実装経験、ベクトルデータベースの運用知識、AWSインフラの設計・構築スキルが身につきます。",
    tags: [
      "Go",
      "PostgreSQL",
      "AWS",
      "pgvector",
      "API設計",
      "マッチングアルゴリズム",
    ],
    requiredQualifications:
      "Go言語でのWebアプリケーション開発経験3年以上。RDBMSを用いたバックエンド開発の実務経験。",
    preferredQualifications:
      "PostgreSQLの運用・チューニング経験。AWSでのインフラ構築経験。統計学やデータサイエンスへの興味。OSS活動やテックブログでの発信経験。",
    workLocation: "東京都渋谷区（フルリモート勤務可）",
    workLocationChangeScope: "当面なし",
    jobDescriptionChangeScope: "当面なし",
    contractType: "無期",
    probationPeriod: "入社後3ヶ月（条件変更なし）",
    workHours:
      "フレックスタイム制（コアタイムなし）標準労働時間8時間",
    breakTime: "60分",
    holidays:
      "完全週休2日制（土日祝）、年末年始休暇、有給休暇（入社半年後10日付与）、慶弔休暇、産前産後休暇、育児休暇",
    salaryMin: 600,
    salaryMax: 1000,
    salaryDetail:
      "月給50万円〜83万円（固定残業代45時間分を含む）。経験・能力を考慮の上決定。",
    insurance: "健康保険、厚生年金、雇用保険、労災保険",
    smokingPolicy: "屋内原則禁煙（喫煙専用室あり）",
    benefits: [
      "リモートワーク手当月3万円",
      "書籍購入費全額補助",
      "カンファレンス参加費補助",
      "副業OK",
    ],
    remotePolicy: "フルリモート",
    selectionProcess:
      "書類選考 → 技術面接（コーディングテスト含む） → 最終面接 → 内定",
    publishedAt: "2026-04-15",
  },
};

function SectionTitle({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon && (
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
        >
          {icon}
        </span>
      )}
      <h2 className="text-2xl font-bold tracking-tight text-gray-900">
        {children}
      </h2>
    </div>
  );
}

function StatCell({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 px-4 py-5 sm:px-5">
      <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
        <span className="text-gray-400">{icon}</span>
        {label}
      </div>
      <div className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">
        {value}
      </div>
    </div>
  );
}

function HighlightCard({
  label,
  title,
  body,
  icon,
  tone,
}: {
  label: string;
  title: string;
  body: string;
  icon: React.ReactNode;
  tone: { bg: string; ring: string; fg: string };
}) {
  return (
    <div className="flex h-full flex-col gap-3.5 rounded-2xl border border-gray-200/80 bg-white p-6">
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: tone.bg, color: tone.fg, boxShadow: `inset 0 0 0 1px ${tone.ring}` }}
        >
          {icon}
        </span>
        <span
          className="text-sm font-semibold tracking-wide"
          style={{ color: tone.fg }}
        >
          {label}
        </span>
      </div>
      <h3 className="text-lg font-bold leading-snug text-gray-900">
        {title}
      </h3>
      <p className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">
        {body}
      </p>
    </div>
  );
}

function BenefitCell({
  text,
  icon,
}: {
  text: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl border border-gray-200/80 bg-white p-4">
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${ACCENT}10`, color: ACCENT }}
      >
        {icon}
      </span>
      <span className="text-base font-medium leading-snug text-gray-800">
        {text}
      </span>
    </div>
  );
}

function ConditionGroup({
  title,
  rows,
  icon,
}: {
  title: string;
  rows: { label: string; value: string }[];
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-200/80 bg-white p-6">
      <div className="mb-4 flex items-center gap-2.5 border-b border-gray-100 pb-3.5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-md"
          style={{ backgroundColor: `${ACCENT}12`, color: ACCENT }}
        >
          {icon}
        </span>
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
      </div>
      <dl className="flex flex-col gap-3.5">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-1">
            <dt className="text-xs font-medium tracking-wide text-gray-500">
              {r.label}
            </dt>
            <dd className="text-[15px] leading-relaxed text-gray-900 whitespace-pre-wrap">
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function JobDetailPage() {
  const { company, job } = MOCK;

  const metaBadges = [
    { label: job.employmentType },
    { label: job.jobCategory },
    { label: job.remotePolicy },
  ];

  const quickFacts = [
    {
      label: "想定年収",
      value: (
        <span>
          {job.salaryMin}
          <span className="text-base font-medium text-gray-500">〜</span>
          {job.salaryMax}
          <span className="ml-0.5 text-sm font-medium text-gray-500">
            万円
          </span>
        </span>
      ),
      icon: <YenIcon />,
    },
    { label: "雇用形態", value: job.employmentType, icon: <BriefcaseIcon /> },
    { label: "採用人数", value: job.hiringCount, icon: <UsersIcon /> },
    { label: "勤務形態", value: job.remotePolicy, icon: <HomeIcon /> },
  ];

  const highlightCards = [
    {
      label: "ROLE",
      title: "仕事内容",
      body: job.description,
      icon: <SparkIcon />,
      tone: { bg: "#EAF4F0", ring: "#3D8B6E33", fg: "#3D8B6E" },
    },
    {
      label: "APPEAL",
      title: "この仕事の魅力",
      body: job.appealPoints,
      icon: <StarIcon />,
      tone: { bg: "#FEF7E6", ring: "#E0A92033", fg: "#B07914" },
    },
    {
      label: "CHALLENGE",
      title: "技術的チャレンジ",
      body: job.challenges,
      icon: <FlagIcon />,
      tone: { bg: "#EEF2FB", ring: "#3B82F633", fg: "#3B6FCC" },
    },
    {
      label: "GROWTH",
      title: "身につくスキル",
      body: job.skillsGained,
      icon: <BoltIcon />,
      tone: { bg: "#F3EEFB", ring: "#8B5CF633", fg: "#7647C5" },
    },
  ];

  const benefitIcons: React.ReactNode[] = [
    <HomeIcon key="h" />,
    <BookIcon key="b" />,
    <TicketIcon key="t" />,
    <SideIcon key="s" />,
  ];

  const workConditions = [
    { label: "勤務地", value: job.workLocation },
    { label: "勤務時間", value: job.workHours },
    { label: "休憩時間", value: job.breakTime },
    { label: "休日・休暇", value: job.holidays },
  ];
  const compensationConditions = [
    { label: "年収レンジ", value: `${job.salaryMin}万円 〜 ${job.salaryMax}万円` },
    { label: "給与詳細", value: job.salaryDetail },
    { label: "社会保険", value: job.insurance },
  ];
  const contractConditions = [
    { label: "契約期間", value: job.contractType },
    { label: "試用期間", value: job.probationPeriod },
    { label: "就業場所の変更範囲", value: job.workLocationChangeScope },
    { label: "業務内容の変更範囲", value: job.jobDescriptionChangeScope },
    { label: "受動喫煙対策", value: job.smokingPolicy },
  ];

  const selectionSteps = job.selectionProcess.split("→").map((s) => s.trim());

  return (
    <div className="min-h-screen bg-[#f6f7f5]">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 pb-24 pt-8">
        {/* ─── Hero ─── */}
        <section className={`overflow-hidden ${cardClass}`}>
          <div className="relative w-full overflow-hidden bg-gray-100 aspect-[16/9]">
            <img
              src="/job-cover.png"
              alt=""
              className="h-full w-full object-contain"
            />
          </div>

          <div className="px-6 pb-6 pt-6 sm:px-8">
            <Link
              href={`/companies/${company.id}`}
              className="inline-flex items-center gap-3 group"
            >
              <div className="h-10 w-10 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden bg-white">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className="text-sm font-bold"
                    style={{ color: ACCENT }}
                  >
                    {company.name.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <p className="text-base font-medium text-gray-900 group-hover:underline">
                  {company.name}
                </p>
                <p className="text-sm text-gray-500">
                  {company.industry} / {company.location}
                </p>
              </div>
            </Link>

            <h1 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 leading-snug sm:text-[32px]">
              {job.title}
            </h1>

            <div className="mt-5 flex flex-wrap gap-2">
              {metaBadges.map((b) => (
                <span
                  key={b.label}
                  className="inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium"
                  style={{
                    borderColor: `${ACCENT}40`,
                    backgroundColor: `${ACCENT}12`,
                    color: ACCENT,
                  }}
                >
                  {b.label}
                </span>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {job.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
                >
                  #{tag}
                </span>
              ))}
            </div>

            {/* Quick Facts strip */}
            <div className="mt-6 grid grid-cols-2 divide-x divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 bg-gray-50/40 sm:grid-cols-4 sm:divide-y-0">
              {quickFacts.map((f) => (
                <StatCell
                  key={f.label}
                  label={f.label}
                  value={f.value}
                  icon={f.icon}
                />
              ))}
            </div>

            <div className="mt-7 flex gap-3">
              <button
                className="flex-1 rounded-xl py-4 text-center text-base font-bold text-white transition-colors hover:opacity-90 cursor-pointer"
                style={{ background: ACCENT }}
              >
                この求人に応募する
              </button>
              <button className="rounded-xl border border-gray-300 px-5 py-4 text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
                <BookmarkIcon />
              </button>
            </div>
          </div>
        </section>

        {/* ─── Highlights (4 cards in 2x2 grid) ─── */}
        <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
          <SectionTitle icon={<LayersIcon />}>ハイライト</SectionTitle>
          <p className="mt-2 text-sm text-gray-500">
            この仕事を一目で掴むための4つの視点
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {highlightCards.map((c) => (
              <HighlightCard key={c.label} {...c} />
            ))}
          </div>
        </section>

        {/* ─── Team accent panel ─── */}
        <section className={`overflow-hidden ${cardClass}`}>
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr]">
            <div
              className="flex items-center justify-center px-6 py-6 sm:py-8"
              style={{
                background: `linear-gradient(135deg, ${ACCENT}14 0%, ${ACCENT}06 100%)`,
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${ACCENT}1f`, color: ACCENT }}
                >
                  <PeopleIcon />
                </span>
                <span
                  className="text-sm font-semibold tracking-wide"
                  style={{ color: ACCENT }}
                >
                  TEAM
                </span>
              </div>
            </div>
            <div className="px-6 py-6 sm:px-7 sm:py-7">
              <h2 className="text-xl font-bold text-gray-900">
                チーム紹介
              </h2>
              <p className="mt-3 text-base leading-relaxed text-gray-700 whitespace-pre-wrap">
                {job.teamDescription}
              </p>
            </div>
          </div>
        </section>

        {/* ─── Requirements (2-column compare) ─── */}
        <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
          <SectionTitle icon={<CheckSquareIcon />}>応募要件</SectionTitle>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div
              className="rounded-2xl border p-6"
              style={{
                borderColor: `${ACCENT}40`,
                backgroundColor: `${ACCENT}08`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-flex h-7 items-center rounded-md px-2.5 text-sm font-bold text-white"
                  style={{ background: ACCENT }}
                >
                  必須
                </span>
                <h3 className="text-base font-bold text-gray-900">
                  これが満たせれば応募可
                </h3>
              </div>
              <p className="mt-3.5 text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                {job.requiredQualifications}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-6">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-7 items-center rounded-md bg-gray-400 px-2.5 text-sm font-bold text-white">
                  歓迎
                </span>
                <h3 className="text-base font-bold text-gray-900">
                  あれば嬉しい経験
                </h3>
              </div>
              <p className="mt-3.5 text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                {job.preferredQualifications}
              </p>
            </div>
          </div>
        </section>

        {/* ─── Benefits (icon grid) ─── */}
        <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
          <SectionTitle icon={<GiftIcon />}>福利厚生</SectionTitle>
          <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {job.benefits.map((b, i) => (
              <BenefitCell
                key={b}
                text={b}
                icon={benefitIcons[i % benefitIcons.length]}
              />
            ))}
          </div>
        </section>

        {/* ─── Conditions (3-column grouped) ─── */}
        <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
          <SectionTitle icon={<DocumentIcon />}>募集要項</SectionTitle>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <ConditionGroup
              title="勤務情報"
              rows={workConditions}
              icon={<ClockIcon />}
            />
            <ConditionGroup
              title="給与・報酬"
              rows={compensationConditions}
              icon={<YenIcon />}
            />
            <ConditionGroup
              title="契約・その他"
              rows={contractConditions}
              icon={<ShieldIcon />}
            />
          </div>
        </section>

        {/* ─── Selection Process ─── */}
        <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
          <SectionTitle icon={<RouteIcon />}>選考フロー</SectionTitle>
          <ol className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {selectionSteps.map((step, i, arr) => (
              <li key={i} className="flex items-center gap-2">
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ background: ACCENT }}
                  >
                    {i + 1}
                  </span>
                  <span className="text-base font-medium text-gray-800 whitespace-nowrap">
                    {step}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <svg
                    className="h-5 w-5 shrink-0 text-gray-300"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* ─── Company Info Mini ─── */}
        <section className={`overflow-hidden ${cardClass}`}>
          <div className="px-6 py-6 sm:px-7">
            <SectionTitle icon={<BuildingIcon />}>企業情報</SectionTitle>
            <Link
              href={`/companies/${company.id}`}
              className="mt-5 flex items-center gap-4 rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors group"
            >
              <div className="h-14 w-14 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden bg-white shrink-0">
                {company.logoUrl ? (
                  <img
                    src={company.logoUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span
                    className="text-lg font-bold"
                    style={{ color: ACCENT }}
                  >
                    {company.name.charAt(0)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-gray-900 group-hover:underline">
                  {company.name}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {company.industry} / {company.location} / {company.employeeCount}
                </p>
              </div>
              <svg
                className="h-5 w-5 text-gray-400 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          </div>
        </section>

        {/* ─── Sticky CTA (mobile) ─── */}
        <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/95 backdrop-blur-sm z-50 sm:hidden">
          <div className="mx-auto max-w-3xl flex items-center gap-3 px-4 py-3">
            <button
              className="flex-1 rounded-xl py-3.5 text-center text-base font-bold text-white cursor-pointer"
              style={{ background: ACCENT }}
            >
              この求人に応募する
            </button>
            <button className="rounded-xl border border-gray-300 px-4 py-3.5 text-base text-gray-700 cursor-pointer">
              <BookmarkIcon />
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mt-2">
          {job.publishedAt} 掲載
        </p>
      </div>
    </div>
  );
}

/* ── Icons ── */

function BookmarkIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function YenIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 4l7 9 7-9" />
      <path d="M7 13h10" />
      <path d="M7 17h10" />
      <path d="M12 13v7" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2 2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="M5.6 5.6l2.8 2.8" />
      <path d="M15.6 15.6l2.8 2.8" />
      <path d="M5.6 18.4l2.8-2.8" />
      <path d="M15.6 8.4l2.8-2.8" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2l2.9 6.9L22 10l-5.5 4.7L18 22l-6-3.6L6 22l1.5-7.3L2 10l7.1-1.1z" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 22V4" />
      <path d="M4 4h13l-2 4 2 4H4" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M13 2L3 14h7l-1 8 11-13h-7z" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg
      className="h-7 w-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M15 20c0-2.4 1.7-4.5 4-5" />
    </svg>
  );
}

function CheckSquareIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 11l3 3 8-8" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
      <path d="M8 8a2.5 2.5 0 0 1 0-5C10 3 12 5 12 8" />
      <path d="M16 8a2.5 2.5 0 0 0 0-5C14 3 12 5 12 8" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4z" />
      <path d="M4 17a3 3 0 0 1 3-3h12" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z" />
      <path d="M9 6v12" strokeDasharray="2 2" />
    </svg>
  );
}

function SideIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="19" r="3" />
      <circle cx="18" cy="5" r="3" />
      <path d="M6 16V8a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 8h.01" />
      <path d="M14 8h.01" />
      <path d="M9 12h.01" />
      <path d="M14 12h.01" />
      <path d="M9 16h.01" />
      <path d="M14 16h.01" />
    </svg>
  );
}
