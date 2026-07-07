"use client";

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
import {
  EMPLOYMENT_TYPES,
  JOB_CATEGORIES,
  REMOTE_POLICIES,
  SMOKING_POLICIES,
} from "@/constants/job-options";
import { ACCENT } from "@/constants/theme";
import { uploadCoverImage, uploadGalleryImage } from "../api";
import type { CompanyProfile } from "../useCompanyProfile";
import type { JobFormValues, SetJobFormField } from "../useJobForm";
import {
  BenefitTagInput,
  EditableConditionGroup,
  EditableHighlightCard,
  InlineInput,
  InlineSelect,
  InlineTagInput,
  InlineTextarea,
} from "./inline-inputs";

export const cardClass =
  "rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]";

export type JobFormUploaders = {
  uploadCover: (file: File) => Promise<string>;
  uploadGallery: (file: File) => Promise<string>;
};

const defaultUploaders: JobFormUploaders = {
  uploadCover: uploadCoverImage,
  uploadGallery: uploadGalleryImage,
};

/**
 * 求人フォームの入力UI本体（Hero〜企業情報の全セクション）。
 * ページ側はツールバー・保存処理・チームセクション（teamSection スロット）を持つ。
 */
export function JobPostingForm({
  values,
  set,
  company,
  titlePlaceholder = "求人タイトルを入力...",
  teamSection,
  uploaders = defaultUploaders,
}: {
  values: JobFormValues;
  set: SetJobFormField;
  company: CompanyProfile | null;
  titlePlaceholder?: string;
  teamSection?: React.ReactNode;
  uploaders?: JobFormUploaders;
}) {
  return (
    <>
      {/* Hero */}
      <section className={`overflow-hidden ${cardClass}`}>
        {/* Cover image */}
        {values.coverImage ? (
          <div className="relative group">
            <img src={values.coverImage} alt="" className="w-full aspect-[16/9] object-cover" />
            <button
              type="button"
              onClick={() => {
                set("coverImage", null);
                set("coverImageDataUrl", null);
              }}
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center py-10 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
            <svg
              className="h-8 w-8 text-gray-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span className="mt-2 text-sm text-gray-400">カバー写真を追加</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const url = await uploaders.uploadCover(file);
                  set("coverImage", url);
                  set("coverImageDataUrl", null);
                } catch {
                  // upload failed
                }
                e.target.value = "";
              }}
            />
          </label>
        )}

        <div className="px-6 pb-6 pt-6 sm:px-8">
          {company && (
            <div className="inline-flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden bg-white">
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold" style={{ color: ACCENT }}>
                    {company.companyName.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <p className="text-base font-medium text-gray-900">{company.companyName}</p>
                <p className="text-sm text-gray-500">
                  {company.industry} / {company.location}
                </p>
              </div>
            </div>
          )}

          {/* Editable title */}
          <textarea
            value={values.title}
            onChange={(e) => {
              set("title", e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = `${el.scrollHeight}px`;
              }
            }}
            rows={1}
            placeholder={titlePlaceholder}
            className="mt-5 w-full text-2xl font-bold tracking-tight text-gray-900 leading-snug sm:text-[26px] bg-transparent outline-none border-b-2 border-transparent hover:border-gray-200 focus:border-brand transition-colors pb-1 resize-none overflow-hidden"
          />

          {/* Meta badges — editable selects */}
          <div className="mt-5 flex flex-wrap gap-2 items-center">
            <span
              className="inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium"
              style={{
                borderColor: `${ACCENT}40`,
                backgroundColor: `${ACCENT}12`,
                color: ACCENT,
              }}
            >
              <InlineSelect
                value={values.employmentType}
                options={EMPLOYMENT_TYPES}
                onChange={(v) => set("employmentType", v)}
                placeholder="雇用形態"
              />
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium"
              style={{
                borderColor: `${ACCENT}40`,
                backgroundColor: `${ACCENT}12`,
                color: ACCENT,
              }}
            >
              <InlineSelect
                value={values.jobCategory}
                options={JOB_CATEGORIES.map((c) => ({ value: c, label: c }))}
                onChange={(v) => set("jobCategory", v)}
                placeholder="職種カテゴリ"
              />
            </span>
            <span
              className="inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium"
              style={{
                borderColor: `${ACCENT}40`,
                backgroundColor: `${ACCENT}12`,
                color: ACCENT,
              }}
            >
              <InlineSelect
                value={values.remotePolicy}
                options={REMOTE_POLICIES}
                onChange={(v) => set("remotePolicy", v)}
                placeholder="勤務形態"
              />
            </span>
          </div>

          {/* Tags */}
          <div className="mt-3">
            <InlineTagInput
              tags={values.tags}
              onAdd={(tag) => set("tags", [...values.tags, tag])}
              onRemove={(i) =>
                set(
                  "tags",
                  values.tags.filter((_, idx) => idx !== i),
                )
              }
            />
          </div>

          {/* Quick Facts */}
          <div className="mt-6 grid grid-cols-2 divide-x divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 bg-gray-50/40 sm:grid-cols-4 sm:divide-y-0">
            <div className="flex flex-col gap-2 px-4 py-5 sm:px-5">
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                <span className="text-gray-400">
                  <YenIcon />
                </span>
                想定年収
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={values.salaryMin ?? ""}
                  onChange={(e) =>
                    set("salaryMin", e.target.value ? Math.min(Number(e.target.value), 9999) : null)
                  }
                  max={9999}
                  placeholder="下限"
                  className="w-16 text-xl font-bold text-gray-900 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-brand transition-colors"
                />
                <span className="text-base font-medium text-gray-500">〜</span>
                <input
                  type="number"
                  value={values.salaryMax ?? ""}
                  onChange={(e) =>
                    set("salaryMax", e.target.value ? Math.min(Number(e.target.value), 9999) : null)
                  }
                  max={9999}
                  placeholder="上限"
                  className="w-16 text-xl font-bold text-gray-900 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-brand transition-colors"
                />
                <span className="ml-0.5 text-sm font-medium text-gray-500">万円</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 px-4 py-5 sm:px-5">
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                <span className="text-gray-400">
                  <BriefcaseIcon />
                </span>
                雇用形態
              </div>
              <div className="text-xl font-bold leading-tight text-gray-900">
                {values.employmentType || (
                  <span className="text-sm font-normal italic text-gray-300">未選択</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 px-4 py-5 sm:px-5">
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                <span className="text-gray-400">
                  <UsersIcon />
                </span>
                採用人数
              </div>
              <InlineInput
                value={values.hiringCount}
                onChange={(v) => set("hiringCount", v)}
                placeholder="例: 1〜2名"
                className="text-xl font-bold leading-tight text-gray-900"
              />
            </div>
            <div className="flex flex-col gap-2 px-4 py-5 sm:px-5">
              <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                <span className="text-gray-400">
                  <HomeIcon />
                </span>
                勤務形態
              </div>
              <div className="text-xl font-bold leading-tight text-gray-900">
                {values.remotePolicy || (
                  <span className="text-sm font-normal italic text-gray-300">未選択</span>
                )}
              </div>
            </div>
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
          <EditableHighlightCard
            label="ROLE"
            title={values.highlightTitleRole}
            onTitleChange={(v) => set("highlightTitleRole", v)}
            titlePlaceholder="仕事内容"
            value={values.description}
            onChange={(v) => set("description", v)}
            icon={<SparkIcon />}
            tone={{ bg: "#EAF4F0", ring: `${ACCENT}33`, fg: ACCENT }}
            placeholder="この求人の仕事内容を記入..."
          />
          <EditableHighlightCard
            label="APPEAL"
            title={values.highlightTitleAppeal}
            onTitleChange={(v) => set("highlightTitleAppeal", v)}
            titlePlaceholder="この仕事の魅力"
            value={values.appealPoints}
            onChange={(v) => set("appealPoints", v)}
            icon={<StarIcon />}
            tone={{ bg: "#FEF7E6", ring: "#E0A92033", fg: "#B07914" }}
            placeholder="この求人の魅力を記入..."
          />
          <EditableHighlightCard
            label="CHALLENGE"
            title={values.highlightTitleChallenge}
            onTitleChange={(v) => set("highlightTitleChallenge", v)}
            titlePlaceholder="チャレンジ"
            value={values.challenges}
            onChange={(v) => set("challenges", v)}
            icon={<FlagIcon />}
            tone={{ bg: "#EEF2FB", ring: "#3B82F633", fg: "#3B6FCC" }}
            placeholder="この仕事で直面するチャレンジを記入..."
          />
          <EditableHighlightCard
            label="GROWTH"
            title={values.highlightTitleGrowth}
            onTitleChange={(v) => set("highlightTitleGrowth", v)}
            titlePlaceholder="身につくスキル"
            value={values.skillsGained}
            onChange={(v) => set("skillsGained", v)}
            icon={<BoltIcon />}
            tone={{ bg: "#F3EEFB", ring: "#8B5CF633", fg: "#7647C5" }}
            placeholder="この求人で身につくスキルを記入..."
          />
        </div>
      </section>

      {/* Photo gallery */}
      <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
        <SectionTitle icon={<CameraIcon />}>フォトギャラリー</SectionTitle>
        {values.galleryImages.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2">
            {values.galleryImages.map((url, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden aspect-[4/3]">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "galleryImages",
                      values.galleryImages.filter((_, idx) => idx !== i),
                    )
                  }
                  className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <svg
                    className="h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
        <label className="mt-3 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-6 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors">
          <svg
            className="h-5 w-5 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span className="text-sm text-gray-400">写真を追加</span>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={async (e) => {
              const files = e.target.files;
              if (!files) return;
              for (const file of Array.from(files)) {
                try {
                  const url = await uploaders.uploadGallery(file);
                  set("galleryImages", (prev) => [...prev, url]);
                } catch {
                  // upload failed
                }
              }
              e.target.value = "";
            }}
          />
        </label>
      </section>

      {/* Team */}
      {teamSection}

      {/* Conditions */}
      <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
        <SectionTitle icon={<DocumentIcon />}>募集要項</SectionTitle>
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <EditableConditionGroup
            title="勤務情報"
            icon={<ClockIcon />}
            rows={[
              {
                label: "勤務地",
                value: values.workLocation,
                onChange: (v) => set("workLocation", v),
                placeholder: "例: 東京都渋谷区",
              },
              {
                label: "勤務時間",
                value: values.workHours,
                onChange: (v) => set("workHours", v),
                placeholder: "例: 9:00〜18:00",
              },
              {
                label: "休憩時間",
                value: values.breakTime,
                onChange: (v) => set("breakTime", v),
                placeholder: "例: 60分",
              },
              {
                label: "休日・休暇",
                value: values.holidays,
                onChange: (v) => set("holidays", v),
                placeholder: "休日・休暇を入力...",
                type: "textarea",
              },
            ]}
          />
          <EditableConditionGroup
            title="給与・報酬"
            icon={<YenIcon />}
            rows={[
              {
                label: "年収レンジ",
                value:
                  values.salaryMin != null || values.salaryMax != null
                    ? `${values.salaryMin ?? "?"}万円 〜 ${values.salaryMax ?? "?"}万円`
                    : "",
                onChange: () => {},
                placeholder: "上部の想定年収欄で入力",
                readOnly: true,
              },
              {
                label: "給与詳細",
                value: values.salaryDetail,
                onChange: (v) => set("salaryDetail", v),
                placeholder: "給与の詳細を入力...",
                type: "textarea",
              },
              {
                label: "社会保険",
                value: values.insurance,
                onChange: (v) => set("insurance", v),
                placeholder: "例: 健康保険、厚生年金...",
              },
            ]}
          />
          <EditableConditionGroup
            title="契約・その他"
            icon={<ShieldIcon />}
            rows={[
              {
                label: "契約期間",
                value: values.contractType,
                onChange: (v) => set("contractType", v),
                placeholder: "例: 無期",
              },
              {
                label: "試用期間",
                value: values.probationPeriod,
                onChange: (v) => set("probationPeriod", v),
                placeholder: "例: 入社後3ヶ月",
              },
              {
                label: "就業場所の変更範囲",
                value: values.workLocationChangeScope,
                onChange: (v) => set("workLocationChangeScope", v),
                placeholder: "例: 当面なし",
              },
              {
                label: "業務内容の変更範囲",
                value: values.jobDescriptionChangeScope,
                onChange: (v) => set("jobDescriptionChangeScope", v),
                placeholder: "例: 当面なし",
              },
              {
                label: "受動喫煙対策",
                value: values.smokingPolicy,
                onChange: (v) => set("smokingPolicy", v),
                placeholder: "選択",
                type: "select",
                options: SMOKING_POLICIES,
              },
            ]}
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
            <InlineTextarea
              value={values.requiredQualifications}
              onChange={(v) => set("requiredQualifications", v)}
              placeholder="必須の資格・経験・スキルを入力..."
              rows={3}
              className="mt-2.5 text-[15px] leading-relaxed text-gray-700"
            />
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <span className="inline-flex h-6 items-center rounded bg-gray-400 px-2 text-sm font-bold text-white">
                歓迎
              </span>
              歓迎要件
            </h3>
            <InlineTextarea
              value={values.preferredQualifications}
              onChange={(v) => set("preferredQualifications", v)}
              placeholder="あると望ましい資格・経験・スキルを入力..."
              rows={3}
              className="mt-2.5 text-[15px] leading-relaxed text-gray-700"
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
        <SectionTitle icon={<GiftIcon />}>福利厚生・待遇</SectionTitle>
        <BenefitTagInput
          tags={values.benefits}
          onAdd={(tag) => set("benefits", [...values.benefits, tag])}
          onRemove={(i) =>
            set(
              "benefits",
              values.benefits.filter((_, idx) => idx !== i),
            )
          }
        />
      </section>

      {/* Selection */}
      <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
        <SectionTitle icon={<RouteIcon />}>選考フロー</SectionTitle>
        <InlineInput
          value={values.selectionProcess}
          onChange={(v) => set("selectionProcess", v)}
          placeholder="例: 書類選考 → 技術面接 → 最終面接 → 内定"
          className="mt-4 text-base text-gray-700"
        />
        {(() => {
          const selectionSteps = values.selectionProcess
            ? values.selectionProcess
                .split("→")
                .map((s) => s.trim())
                .filter(Boolean)
            : [];
          if (selectionSteps.length === 0) return null;
          return (
            <ol className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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
          );
        })()}
      </section>

      {/* Company */}
      {company && (
        <section className={`overflow-hidden ${cardClass}`}>
          <div className="px-6 py-6 sm:px-7">
            <SectionTitle icon={<BuildingIcon />}>企業情報</SectionTitle>
            <div className="mt-5 flex items-center gap-4 rounded-xl border border-gray-200 p-4">
              <div className="h-14 w-14 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden bg-white shrink-0">
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt="" className="h-full w-full object-cover" />
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
    </>
  );
}
