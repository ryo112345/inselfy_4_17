import Link from "next/link";
import {
  BoltIcon,
  BookmarkIcon,
  BriefcaseIcon,
  BuildingIcon,
  CameraIcon,
  CheckSquareIcon,
  ClockIcon,
  DocumentIcon,
  FlagIcon,
  GiftIcon,
  HomeIcon,
  LayersIcon,
  RouteIcon,
  ShieldIcon,
  SparkIcon,
  StarIcon,
  UsersIcon,
  YenIcon,
} from "@/components/icons/job";
import { SectionTitle } from "@/components/ui";
import { ACCENT } from "@/constants/theme";
import { Gallery } from "../../../companies/[id]/Gallery";

const cardClass =
  "rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]";

const MOCK = {
  company: {
    id: "afd20f1c-b6a8-4809-bc8f-b3f41263b511",
    name: "inselfy株式会社",
    logoUrl: "",
    industry: "HRテック",
    location: "東京都渋谷区",
    employeeCount: "10〜30名",
    benefits: [
      "完全週休二日制（土日祝）",
      "年間休日125日",
      "フレックスタイム制",
      "リモートワーク可（週2出社）",
      "交通費全額支給",
      "社会保険完備",
      "書籍購入補助",
      "カンファレンス参加費補助",
      "副業OK",
      "ストックオプション制度",
      "引越し手当",
      "ウェルカムランチ制度",
    ],
    smokingPolicy: "敷地内禁煙（喫煙場所あり）",
    galleryUrls: [
      "/api/uploads/company-images/9418ca2b-5033-4403-b366-790dbc9a911c_gallery_6ffde7f7.jpg",
      "/api/uploads/company-images/9418ca2b-5033-4403-b366-790dbc9a911c_gallery_0d55bb87.jpg",
      "/api/uploads/company-images/9418ca2b-5033-4403-b366-790dbc9a911c_gallery_7937c6cc.jpg",
    ],
  },
  job: {
    title: "バックエンドエンジニア｜Go / PostgreSQL / AWS でプロダクト基盤を設計",
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
    tags: ["Go", "PostgreSQL", "AWS", "pgvector", "API設計", "マッチングアルゴリズム"],
    requiredQualifications:
      "Go言語でのWebアプリケーション開発経験3年以上。RDBMSを用いたバックエンド開発の実務経験。",
    preferredQualifications:
      "PostgreSQLの運用・チューニング経験。AWSでのインフラ構築経験。統計学やデータサイエンスへの興味。OSS活動やテックブログでの発信経験。",
    workLocation: "東京都渋谷区（フルリモート勤務可）",
    workLocationChangeScope: "当面なし",
    jobDescriptionChangeScope: "当面なし",
    contractType: "無期",
    probationPeriod: "入社後3ヶ月（条件変更なし）",
    workHours: "フレックスタイム制（コアタイムなし）標準労働時間8時間",
    breakTime: "60分",
    holidays:
      "完全週休2日制（土日祝）、年末年始休暇、有給休暇（入社半年後10日付与）、慶弔休暇、産前産後休暇、育児休暇",
    salaryMin: 600,
    salaryMax: 1000,
    salaryDetail: "月給50万円〜83万円（固定残業代45時間分を含む）。経験・能力を考慮の上決定。",
    insurance: "健康保険、厚生年金、雇用保険、労災保険",
    remotePolicy: "フルリモート",
    selectionProcess: "書類選考 → 技術面接（コーディングテスト含む） → 最終面接 → 内定",
    publishedAt: "2026-04-15",
  },
  team: {
    size: 5,
    members: [
      { name: "山田 太郎", role: "テックリード", avatarUrl: "" },
      { name: "佐藤 花子", role: "シニアエンジニア", avatarUrl: "" },
      { name: "鈴木 一郎", role: "シニアエンジニア", avatarUrl: "" },
      { name: "田中 美咲", role: "エンジニア", avatarUrl: "" },
      { name: "高橋 健", role: "エンジニア", avatarUrl: "" },
    ],
  },
};

const AVATAR_TONES = [
  { bg: "#EAF4F0", fg: ACCENT },
  { bg: "#FEF7E6", fg: "#B07914" },
  { bg: "#EEF2FB", fg: "#3B6FCC" },
  { bg: "#F3EEFB", fg: "#7647C5" },
  { bg: "#EEF3F4", fg: "#5A6B7B" },
];

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
      <div className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">{value}</div>
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
          style={{
            backgroundColor: tone.bg,
            color: tone.fg,
            boxShadow: `inset 0 0 0 1px ${tone.ring}`,
          }}
        >
          {icon}
        </span>
        <span className="text-sm font-semibold tracking-wide" style={{ color: tone.fg }}>
          {label}
        </span>
      </div>
      <h3 className="text-lg font-bold leading-snug text-gray-900">{title}</h3>
      <p className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">{body}</p>
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
            <dt className="text-xs font-medium tracking-wide text-gray-500">{r.label}</dt>
            <dd className="text-[15px] leading-relaxed text-gray-900 whitespace-pre-wrap">
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function TestJobViewPage() {
  const { company, job, team } = MOCK;

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
          <span className="ml-0.5 text-sm font-medium text-gray-500">万円</span>
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
      tone: { bg: "#EAF4F0", ring: `${ACCENT}33`, fg: ACCENT },
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
      title: "チャレンジ",
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
    { label: "受動喫煙対策", value: company.smokingPolicy },
  ];

  const selectionSteps = job.selectionProcess.split("→").map((s) => s.trim());

  return (
    <div className="min-h-screen bg-[#f6f7f5]">
      {/* Prototype banner */}
      <div className="sticky top-0 z-30 border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-center text-sm text-amber-800">
        プロトタイプ — モックデータを表示しています
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 pb-24 pt-8">
        {/* ─── Hero ─── */}
        <section className={`overflow-hidden ${cardClass}`}>
          <div className="relative w-full overflow-hidden bg-gray-100 aspect-[16/9]">
            <img src="/job-cover.png" alt="" className="h-full w-full object-contain" />
          </div>

          <div className="px-6 pb-6 pt-6 sm:px-8">
            <Link
              href={`/companies/${company.id}`}
              className="inline-flex items-center gap-3 group"
            >
              <div className="h-10 w-10 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden bg-white">
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold" style={{ color: ACCENT }}>
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

            <h1 className="mt-5 text-2xl font-bold tracking-tight text-gray-900 leading-snug sm:text-[26px]">
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
                <StatCell key={f.label} label={f.label} value={f.value} icon={f.icon} />
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
          <p className="mt-2 text-sm text-gray-500">この仕事を一目で掴むための4つの視点</p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {highlightCards.map((c) => (
              <HighlightCard key={c.label} {...c} />
            ))}
          </div>
        </section>

        {/* ─── Photo gallery ─── */}
        {company.galleryUrls.length > 0 && (
          <section className={`overflow-hidden ${cardClass}`}>
            <div className="px-6 pb-2 pt-6 sm:px-7">
              <SectionTitle icon={<CameraIcon />}>フォトギャラリー</SectionTitle>
            </div>
            <div className="mt-3">
              <Gallery urls={company.galleryUrls} />
            </div>
          </section>
        )}

        {/* ─── Team accent panel ─── */}
        <section className={`overflow-hidden ${cardClass}`}>
          <div className="grid grid-cols-1 sm:grid-cols-[360px_1fr]">
            <div
              className="flex flex-col items-center justify-center gap-4 px-6 py-8 sm:py-10"
              style={{
                background: `linear-gradient(135deg, ${ACCENT}14 0%, ${ACCENT}06 100%)`,
              }}
            >
              <div className="flex items-center -space-x-6">
                {team.members.slice(0, 5).map((m, i) => {
                  const tone = AVATAR_TONES[i % AVATAR_TONES.length];
                  const initial = m.name.charAt(0);
                  return (
                    <div
                      key={m.name}
                      className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-white text-2xl font-bold shadow-sm"
                      style={{ backgroundColor: tone.bg, color: tone.fg }}
                      title={`${m.name} / ${m.role}`}
                    >
                      {m.avatarUrl ? (
                        <img
                          src={m.avatarUrl}
                          alt=""
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        initial
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold leading-none" style={{ color: ACCENT }}>
                  {team.size}
                </span>
                <span className="text-base font-semibold" style={{ color: ACCENT }}>
                  名のチーム
                </span>
              </div>
            </div>
            <div className="px-6 py-6 sm:px-7 sm:py-7">
              <h2 className="text-lg font-bold text-gray-900">チーム紹介</h2>
              <p className="mt-3 text-base leading-relaxed text-gray-700 whitespace-pre-wrap">
                {job.teamDescription}
              </p>
            </div>
          </div>
        </section>

        {/* ─── Conditions (3-column grouped) ─── */}
        <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
          <SectionTitle icon={<DocumentIcon />}>募集要項</SectionTitle>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <ConditionGroup title="勤務情報" rows={workConditions} icon={<ClockIcon />} />
            <ConditionGroup title="給与・報酬" rows={compensationConditions} icon={<YenIcon />} />
            <ConditionGroup title="契約・その他" rows={contractConditions} icon={<ShieldIcon />} />
          </div>
        </section>

        {/* ─── Requirements ─── */}
        <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
          <SectionTitle icon={<CheckSquareIcon />}>応募要件</SectionTitle>
          <div className="mt-5 space-y-5">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <span
                  className="inline-flex h-6 items-center rounded px-2 text-sm font-bold text-white"
                  style={{ background: ACCENT }}
                >
                  必須
                </span>
                必須要件
              </h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                {job.requiredQualifications}
              </p>
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <span className="inline-flex h-6 items-center rounded bg-gray-400 px-2 text-sm font-bold text-white">
                  歓迎
                </span>
                歓迎要件
              </h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">
                {job.preferredQualifications}
              </p>
            </div>
          </div>
        </section>

        {/* ─── Benefits (pills, matches company page) ─── */}
        <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
          <SectionTitle icon={<GiftIcon />}>福利厚生・待遇</SectionTitle>
          <ul className="mt-5 flex flex-wrap gap-2">
            {[...company.benefits, ...(company.smokingPolicy ? [company.smokingPolicy] : [])].map(
              (b) => (
                <li
                  key={b}
                  className="inline-flex items-center rounded-full border px-4 py-1.5 text-base font-medium"
                  style={{
                    borderColor: `${ACCENT}40`,
                    backgroundColor: `${ACCENT}12`,
                    color: ACCENT,
                  }}
                >
                  {b}
                </li>
              ),
            )}
          </ul>
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
                  <img src={company.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-lg font-bold" style={{ color: ACCENT }}>
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

        <p className="text-center text-sm text-gray-400 mt-2">{job.publishedAt} 掲載</p>
      </div>
    </div>
  );
}
