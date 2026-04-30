"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gallery } from "@/app/companies/[id]/Gallery";
import { useCompanyAuth } from "@/features/company-auth/company-auth-context";
import {
  JOB_PREVIEW_CHANNEL,
  type JobFormPreviewPayload,
  type JobPreviewMessage,
} from "@/features/job-posting/preview-channel";

const cardClass =
  "rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]";

const ACCENT = "#3D8B6E";

type CompanyProfile = {
  id: string;
  companyName: string;
  industry: string;
  location: string;
  employeeCount: string;
  logoUrl: string;
  benefits: string[];
  smokingPolicy: string;
  galleryUrls: string[];
};

const EMPTY_FORM: JobFormPreviewPayload = {
  title: "",
  jobCategory: "",
  employmentType: "",
  hiringCount: "",
  description: "",
  appealPoints: "",
  challenges: "",
  teamDescription: "",
  teamMembers: [],
  teamLabel: "",
  skillsGained: "",
  tags: [],
  requiredQualifications: "",
  preferredQualifications: "",
  workLocation: "",
  workLocationChangeScope: "",
  jobDescriptionChangeScope: "",
  contractType: "",
  probationPeriod: "",
  workHours: "",
  breakTime: "",
  holidays: "",
  salaryMin: null,
  salaryMax: null,
  salaryDetail: "",
  insurance: "",
  remotePolicy: "",
  benefits: "",
  smokingPolicy: "",
  selectionProcess: "",
  highlightTitleRole: "仕事内容",
  highlightTitleAppeal: "この仕事の魅力",
  highlightTitleChallenge: "チャレンジ",
  highlightTitleGrowth: "身につくスキル",
  coverImageDataUrl: null,
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
      <h2 className="text-xl font-bold tracking-tight text-gray-900">
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
          style={{
            backgroundColor: tone.bg,
            color: tone.fg,
            boxShadow: `inset 0 0 0 1px ${tone.ring}`,
          }}
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
      <h3 className="text-lg font-bold leading-snug text-gray-900">{title}</h3>
      <p className="text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap">
        {body || (
          <span className="italic text-gray-300">未入力</span>
        )}
      </p>
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
              {r.value || <span className="italic text-gray-300">未入力</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function CompanyJobPreviewPage() {
  const { companyFetch } = useCompanyAuth();
  const [form, setForm] = useState<JobFormPreviewPayload>(EMPTY_FORM);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [hasReceived, setHasReceived] = useState(false);

  useEffect(() => {
    companyFetch("/api/company/profile").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (!Array.isArray(data.benefits)) data.benefits = [];
        setCompany({
          id: data.id,
          companyName: data.companyName,
          industry: data.industry,
          location: data.location,
          employeeCount: data.employeeCount,
          logoUrl: data.logoUrl,
          benefits: data.benefits ?? [],
          smokingPolicy: data.smokingPolicy ?? "",
          galleryUrls: data.galleryUrls ?? [],
        });
      }
    });
  }, [companyFetch]);

  useEffect(() => {
    const channel = new BroadcastChannel(JOB_PREVIEW_CHANNEL);
    channel.onmessage = (e) => {
      const msg = e.data as JobPreviewMessage;
      if (!msg || typeof msg !== "object" || !("type" in msg)) return;
      if (msg.type === "data") {
        setForm((prev) => ({ ...prev, ...msg.payload }));
        setHasReceived(true);
      }
    };
    // エディタがすでにレンダリング済みの場合に備えて、最新状態の再送を要求する。
    const req: JobPreviewMessage = { type: "request" };
    channel.postMessage(req);
    return () => {
      channel.close();
    };
  }, []);

  if (!hasReceived) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f5] px-4">
        <div className="rounded-2xl border border-gray-200 bg-white px-8 py-10 text-center max-w-md">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-full mb-4"
            style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
          >
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <h1 className="text-base font-semibold text-gray-900">
            プレビューを準備中です
          </h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            求人作成画面でフォームを編集すると、この画面にリアルタイムで反映されます。元のタブを閉じずに編集を続けてください。
          </p>
        </div>
      </div>
    );
  }

  const job = form;

  const metaBadges = [
    job.employmentType,
    job.jobCategory,
    job.remotePolicy,
  ].filter(Boolean);

  const quickFacts = [
    {
      label: "想定年収",
      value:
        job.salaryMin != null || job.salaryMax != null ? (
          <span>
            {job.salaryMin ?? "?"}
            <span className="text-base font-medium text-gray-500">〜</span>
            {job.salaryMax ?? "?"}
            <span className="ml-0.5 text-sm font-medium text-gray-500">
              万円
            </span>
          </span>
        ) : (
          <span className="text-sm font-normal italic text-gray-300">
            未入力
          </span>
        ),
      icon: <YenIcon />,
    },
    {
      label: "雇用形態",
      value: job.employmentType || (
        <span className="text-sm font-normal italic text-gray-300">
          未入力
        </span>
      ),
      icon: <BriefcaseIcon />,
    },
    {
      label: "採用人数",
      value: job.hiringCount || (
        <span className="text-sm font-normal italic text-gray-300">
          未入力
        </span>
      ),
      icon: <UsersIcon />,
    },
    {
      label: "勤務形態",
      value: job.remotePolicy || (
        <span className="text-sm font-normal italic text-gray-300">
          未入力
        </span>
      ),
      icon: <HomeIcon />,
    },
  ];

  const highlightCards = [
    {
      label: "ROLE",
      title: job.highlightTitleRole || "仕事内容",
      body: job.description,
      icon: <SparkIcon />,
      tone: { bg: "#EAF4F0", ring: "#3D8B6E33", fg: "#3D8B6E" },
    },
    {
      label: "APPEAL",
      title: job.highlightTitleAppeal || "この仕事の魅力",
      body: job.appealPoints,
      icon: <StarIcon />,
      tone: { bg: "#FEF7E6", ring: "#E0A92033", fg: "#B07914" },
    },
    {
      label: "CHALLENGE",
      title: job.highlightTitleChallenge || "チャレンジ",
      body: job.challenges,
      icon: <FlagIcon />,
      tone: { bg: "#EEF2FB", ring: "#3B82F633", fg: "#3B6FCC" },
    },
    {
      label: "GROWTH",
      title: job.highlightTitleGrowth || "身につくスキル",
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
    {
      label: "年収レンジ",
      value:
        job.salaryMin != null || job.salaryMax != null
          ? `${job.salaryMin ?? "?"}万円 〜 ${job.salaryMax ?? "?"}万円`
          : "",
    },
    { label: "給与詳細", value: job.salaryDetail },
    { label: "社会保険", value: job.insurance },
  ];
  const contractConditions = [
    { label: "契約期間", value: job.contractType },
    { label: "試用期間", value: job.probationPeriod },
    { label: "就業場所の変更範囲", value: job.workLocationChangeScope },
    { label: "業務内容の変更範囲", value: job.jobDescriptionChangeScope },
    { label: "受動喫煙対策", value: job.smokingPolicy || company?.smokingPolicy || "" },
  ];

  const selectionSteps = job.selectionProcess
    ? job.selectionProcess.split("→").map((s) => s.trim()).filter(Boolean)
    : [];

  const benefitsList = (() => {
    const fromForm = job.benefits
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (fromForm.length > 0) return fromForm;
    return company?.benefits ?? [];
  })();

  return (
    <div className="min-h-screen bg-[#f6f7f5]">
      {/* Preview Banner */}
      <div className="sticky top-0 z-30 border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-center text-sm text-amber-800">
        この画面はプレビューです。求職者にはこのように表示されます。
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 pb-24 pt-8">
        {/* Hero */}
        <section className={`overflow-hidden ${cardClass}`}>
          {form.coverImageDataUrl && (
            <img src={form.coverImageDataUrl} alt="" className="w-full aspect-[16/9] object-cover" />
          )}
          <div className="px-6 pb-6 pt-6 sm:px-8">
            {company && (
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
                      {company.companyName.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-base font-medium text-gray-900 group-hover:underline">
                    {company.companyName}
                  </p>
                  <p className="text-sm text-gray-500">
                    {company.industry} / {company.location}
                  </p>
                </div>
              </Link>
            )}

            <h1 className="mt-5 text-2xl font-bold tracking-tight text-gray-900 leading-snug sm:text-[26px]">
              {job.title || (
                <span className="italic text-gray-300">求人タイトルを入力</span>
              )}
            </h1>

            {metaBadges.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {metaBadges.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium"
                    style={{
                      borderColor: `${ACCENT}40`,
                      backgroundColor: `${ACCENT}12`,
                      color: ACCENT,
                    }}
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}

            {job.tags.length > 0 && (
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
            )}

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
                disabled
                className="flex-1 rounded-xl py-4 text-center text-base font-bold text-white opacity-60"
                style={{ background: ACCENT }}
              >
                この求人に応募する
              </button>
              <button
                disabled
                className="rounded-xl border border-gray-300 px-5 py-4 text-base font-medium text-gray-700 opacity-60"
              >
                <BookmarkIcon />
              </button>
            </div>
          </div>
        </section>

        {/* Highlights */}
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

        {/* Photo gallery */}
        {company && company.galleryUrls.length > 0 && (
          <section className={`overflow-hidden ${cardClass}`}>
            <div className="px-6 pb-2 pt-6 sm:px-7">
              <SectionTitle icon={<CameraIcon />}>
                フォトギャラリー
              </SectionTitle>
            </div>
            <div className="mt-3">
              <Gallery urls={company.galleryUrls} />
            </div>
          </section>
        )}

        {/* Team */}
        {(job.teamDescription || job.teamMembers.length > 0 || job.teamLabel) && (
          <section className={`overflow-hidden ${cardClass}`}>
            <div className="grid grid-cols-1 sm:grid-cols-[360px_1fr]">
              {(job.teamMembers.length > 0 || job.teamLabel) && (
                <div
                  className="flex flex-col items-center justify-center gap-4 px-6 py-8 sm:py-10"
                  style={{ background: `linear-gradient(135deg, ${ACCENT}14 0%, ${ACCENT}06 100%)` }}
                >
                  {job.teamMembers.length > 0 && (
                    <div className="flex items-center -space-x-6">
                      {job.teamMembers.map((m, i) => {
                        const colors = [
                          { bg: "#EAF4F0", fg: "#3D8B6E" },
                          { bg: "#EEF2FB", fg: "#3B6FCC" },
                          { bg: "#FEF7E6", fg: "#B07914" },
                          { bg: "#F3EEFB", fg: "#7647C5" },
                          { bg: "#FEE", fg: "#C54747" },
                        ];
                        const color = colors[i % colors.length];
                        return (
                          <div
                            key={i}
                            className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-white text-2xl font-bold shadow-sm overflow-hidden"
                            style={{ backgroundColor: color.bg, color: color.fg }}
                          >
                            {m.photoUrl ? (
                              <img src={m.photoUrl} alt={m.name} className="h-full w-full object-cover" />
                            ) : (
                              m.name.charAt(0)
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {job.teamLabel && (
                    <span className="text-base font-semibold" style={{ color: ACCENT }}>
                      {job.teamLabel}
                    </span>
                  )}
                </div>
              )}
              <div className="px-6 py-6 sm:px-7 sm:py-7">
                <h2 className="text-lg font-bold text-gray-900">チーム紹介</h2>
                {job.teamDescription && (
                  <p className="mt-3 text-base leading-relaxed text-gray-700 whitespace-pre-wrap">
                    {job.teamDescription}
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Conditions */}
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

        {/* Requirements */}
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
                {job.requiredQualifications || (
                  <span className="italic text-gray-300">未入力</span>
                )}
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
                {job.preferredQualifications || (
                  <span className="italic text-gray-300">未入力</span>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        {benefitsList.length > 0 && (
          <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
            <SectionTitle icon={<GiftIcon />}>福利厚生・待遇</SectionTitle>
            <ul className="mt-5 flex flex-wrap gap-2">
              {[
                ...benefitsList,
                ...(job.smokingPolicy ? [job.smokingPolicy] : []),
              ].map((b) => (
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
              ))}
            </ul>
          </section>
        )}

        {/* Selection */}
        {selectionSteps.length > 0 && (
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
        )}

        {/* Company */}
        {company && (
          <section className={`overflow-hidden ${cardClass}`}>
            <div className="px-6 py-6 sm:px-7">
              <SectionTitle icon={<BuildingIcon />}>企業情報</SectionTitle>
              <div className="mt-5 flex items-center gap-4 rounded-xl border border-gray-200 p-4">
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
                      {company.companyName.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-gray-900">
                    {company.companyName}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {company.industry} / {company.location} /{" "}
                    {company.employeeCount}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ── Icons ── */

function BookmarkIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function YenIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4l7 9 7-9" /><path d="M7 13h10" /><path d="M7 17h10" /><path d="M12 13v7" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 13h18" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
    </svg>
  );
}
function LayersIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4" /><path d="M12 17v4" /><path d="M3 12h4" /><path d="M17 12h4" /><path d="M5.6 5.6l2.8 2.8" /><path d="M15.6 15.6l2.8 2.8" /><path d="M5.6 18.4l2.8-2.8" /><path d="M15.6 8.4l2.8-2.8" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.9 6.9L22 10l-5.5 4.7L18 22l-6-3.6L6 22l1.5-7.3L2 10l7.1-1.1z" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22V4" /><path d="M4 4h13l-2 4 2 4H4" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h7l-1 8 11-13h-7z" />
    </svg>
  );
}
function CheckSquareIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3 8-8" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
function GiftIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" /><path d="M8 8a2.5 2.5 0 0 1 0-5C10 3 12 5 12 8" /><path d="M16 8a2.5 2.5 0 0 0 0-5C14 3 12 5 12 8" />
    </svg>
  );
}
function DocumentIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h6" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" />
    </svg>
  );
}
function RouteIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="3" /><circle cx="18" cy="5" r="3" /><path d="M6 16V8a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h.01" /><path d="M14 8h.01" /><path d="M9 12h.01" /><path d="M14 12h.01" /><path d="M9 16h.01" /><path d="M14 16h.01" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="4" />
    </svg>
  );
}
