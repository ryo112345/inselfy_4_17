"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Gallery } from "@/app/companies/[id]/Gallery";
import {
  CI_FULL_LABELS,
  CI_ORDER,
  SingleRadarChart,
  WV_FULL_LABELS,
  WV_ORDER,
} from "@/app/components/SingleRadarChart";
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
import {
  ConditionGroup,
  cardClass,
  HighlightCard,
  StatCell,
} from "@/features/job-posting/components/view-parts";
import {
  JOB_PREVIEW_CHANNEL,
  type JobFormPreviewPayload,
  type JobPreviewMessage,
} from "@/features/job-posting/preview-channel";
import { useCompanyProfile } from "@/features/job-posting/useCompanyProfile";

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
  teamId: null,
  teamWVScores: null,
  teamCIScores: null,
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
  coverImageUrl: null,
  galleryUrls: [],
};

const emptyFallback = <span className="italic text-gray-300">未入力</span>;

export default function CompanyJobPreviewPage() {
  const [form, setForm] = useState<JobFormPreviewPayload>(EMPTY_FORM);
  const company = useCompanyProfile();
  const [hasReceived, setHasReceived] = useState(false);

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
          <h1 className="text-base font-semibold text-gray-900">プレビューを準備中です</h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            求人作成画面でフォームを編集すると、この画面にリアルタイムで反映されます。元のタブを閉じずに編集を続けてください。
          </p>
        </div>
      </div>
    );
  }

  const job = form;

  const metaBadges = [job.employmentType, job.jobCategory, job.remotePolicy].filter(Boolean);

  const quickFacts = [
    {
      label: "想定年収",
      value:
        job.salaryMin != null || job.salaryMax != null ? (
          <span>
            {job.salaryMin ?? "?"}
            <span className="text-base font-medium text-gray-500">〜</span>
            {job.salaryMax ?? "?"}
            <span className="ml-0.5 text-sm font-medium text-gray-500">万円</span>
          </span>
        ) : (
          <span className="text-sm font-normal italic text-gray-300">未入力</span>
        ),
      icon: <YenIcon />,
    },
    {
      label: "雇用形態",
      value: job.employmentType || (
        <span className="text-sm font-normal italic text-gray-300">未入力</span>
      ),
      icon: <BriefcaseIcon />,
    },
    {
      label: "採用人数",
      value: job.hiringCount || (
        <span className="text-sm font-normal italic text-gray-300">未入力</span>
      ),
      icon: <UsersIcon />,
    },
    {
      label: "勤務形態",
      value: job.remotePolicy || (
        <span className="text-sm font-normal italic text-gray-300">未入力</span>
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
      tone: { bg: "#EAF4F0", ring: `${ACCENT}33`, fg: ACCENT },
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
    ? job.selectionProcess
        .split("→")
        .map((s) => s.trim())
        .filter(Boolean)
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
          {(form.coverImageDataUrl || form.coverImageUrl) && (
            <img
              src={form.coverImageDataUrl ?? form.coverImageUrl!}
              alt=""
              className="w-full aspect-[16/9] object-cover"
            />
          )}
          <div className="px-6 pb-6 pt-6 sm:px-8">
            {company && (
              <Link
                href={`/companies/${company.id}`}
                className="inline-flex items-center gap-3 group"
              >
                <div className="relative h-10 w-10 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden bg-white">
                  {company.logoUrl ? (
                    <Image
                      src={company.logoUrl}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold" style={{ color: ACCENT }}>
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
              {job.title || <span className="italic text-gray-300">求人タイトルを入力</span>}
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
                <StatCell key={f.label} label={f.label} value={f.value} icon={f.icon} />
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
          <p className="mt-2 text-sm text-gray-500">この仕事を一目で掴むための4つの視点</p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {highlightCards.map((c) => (
              <HighlightCard key={c.label} {...c} fallback={emptyFallback} />
            ))}
          </div>
        </section>

        {/* Photo gallery */}
        {job.galleryUrls.length > 0 && (
          <section className={`overflow-hidden ${cardClass}`}>
            <div className="px-6 pb-2 pt-6 sm:px-7">
              <SectionTitle icon={<CameraIcon />}>フォトギャラリー</SectionTitle>
            </div>
            <div className="mt-3">
              <Gallery urls={job.galleryUrls} />
            </div>
          </section>
        )}

        {/* Team */}
        {(job.teamDescription ||
          job.teamMembers.length > 0 ||
          job.teamLabel ||
          job.teamWVScores ||
          job.teamCIScores) && (
          <section className={`overflow-hidden ${cardClass}`}>
            <div className="grid grid-cols-1 sm:grid-cols-[360px_1fr]">
              {(job.teamMembers.length > 0 || job.teamLabel) && (
                <div
                  className="flex flex-col items-center justify-center gap-4 px-6 py-8 sm:py-10"
                  style={{
                    background: `linear-gradient(135deg, ${ACCENT}14 0%, ${ACCENT}06 100%)`,
                  }}
                >
                  {job.teamMembers.length > 0 && (
                    <div className="flex items-center -space-x-[18px]">
                      {job.teamMembers.map((m, i) => {
                        const colors = [
                          { bg: "#EAF4F0", fg: ACCENT },
                          { bg: "#EEF2FB", fg: "#3B6FCC" },
                          { bg: "#FEF7E6", fg: "#B07914" },
                          { bg: "#F3EEFB", fg: "#7647C5" },
                          { bg: "#FEE", fg: "#C54747" },
                        ];
                        const color = colors[i % colors.length];
                        return (
                          <div
                            key={`${m.name}:${m.photoUrl ?? ""}`}
                            className="relative flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-white text-2xl font-bold shadow-sm overflow-hidden"
                            style={{ backgroundColor: color.bg, color: color.fg }}
                          >
                            {m.photoUrl ? (
                              <Image
                                src={m.photoUrl}
                                alt={m.name}
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            ) : (
                              <span
                                className={
                                  m.name.length >= 5
                                    ? "text-xs"
                                    : m.name.length === 4
                                      ? "text-sm"
                                      : m.name.length === 3
                                        ? "text-base"
                                        : m.name.length === 2
                                          ? "text-xl"
                                          : "text-2xl"
                                }
                              >
                                {m.name.slice(0, 5)}
                              </span>
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
            {(job.teamWVScores || job.teamCIScores) && (
              <div className="border-t border-gray-200 px-6 py-5">
                <h3 className="border-l-[3px] border-emerald-600 pl-3 text-lg font-bold text-gray-900 mb-4">
                  チーム診断結果
                </h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="flex flex-col items-center">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Work Values</h4>
                    {job.teamWVScores ? (
                      <SingleRadarChart
                        scores={job.teamWVScores}
                        order={WV_ORDER}
                        fullLabels={WV_FULL_LABELS}
                        isWV={true}
                      />
                    ) : (
                      <div className="py-10 text-sm text-gray-400">データ準備中</div>
                    )}
                  </div>
                  <div className="flex flex-col items-center">
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Career Interest</h4>
                    {job.teamCIScores ? (
                      <SingleRadarChart
                        scores={job.teamCIScores}
                        order={CI_ORDER}
                        fullLabels={CI_FULL_LABELS}
                        isWV={false}
                      />
                    ) : (
                      <div className="py-10 text-sm text-gray-400">データ準備中</div>
                    )}
                  </div>
                </div>
              </div>
            )}
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
              fallback={emptyFallback}
            />
            <ConditionGroup
              title="給与・報酬"
              rows={compensationConditions}
              icon={<YenIcon />}
              fallback={emptyFallback}
            />
            <ConditionGroup
              title="契約・その他"
              rows={contractConditions}
              icon={<ShieldIcon />}
              fallback={emptyFallback}
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
                {job.requiredQualifications || <span className="italic text-gray-300">未入力</span>}
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
              {[...benefitsList, ...(job.smokingPolicy ? [job.smokingPolicy] : [])].map((b) => (
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
                // biome-ignore lint/suspicious/noArrayIndexKey: 文字列分割由来で同名ステップがあり得る固定表示リスト。並び替え・部分更新なし
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
                <div className="relative h-14 w-14 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden bg-white shrink-0">
                  {company.logoUrl ? (
                    <Image
                      src={company.logoUrl}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-lg font-bold" style={{ color: ACCENT }}>
                      {company.companyName.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-gray-900">{company.companyName}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {company.industry} / {company.location} / {company.employeeCount}
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
