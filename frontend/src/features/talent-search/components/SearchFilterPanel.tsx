"use client";

import { INDUSTRIES, JOB_TYPE_GROUPS, PREFECTURES } from "@/constants/profile-options";
import { SEEKING_STATUS_MAP } from "@/constants/seeking-status";
import type { useTalentSearch } from "../useTalentSearch";

const accentColor = "#2979ff";

function ChipCloseIcon() {
  return (
    <svg
      aria-hidden="true"
      width={10}
      height={10}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/** 検索キーワード・条件フィルタ・適用中チップの表示パネル（Layer 1） */
export function SearchFilterPanel({ search }: { search: ReturnType<typeof useTalentSearch> }) {
  const {
    keyword,
    setKeyword,
    skillInput,
    setSkillInput,
    skills,
    setSkills,
    addSkill,
    removeSkill,
    location,
    setLocation,
    industry,
    setIndustry,
    seekingStatus,
    setSeekingStatus,
    jobType,
    setJobType,
    diagnosedOnly,
    setDiagnosedOnly,
    loading,
    handleSearch,
  } = search;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 mb-3 space-y-2.5">
      {/* Keyword search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="キーワードで検索（名前・肩書き・自己紹介）"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="rounded-lg px-5 py-2 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 cursor-pointer shrink-0"
          style={{ backgroundColor: accentColor }}
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <svg
                aria-hidden="true"
                className="animate-spin h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              検索中
            </span>
          ) : (
            "検索する"
          )}
        </button>
      </div>

      {/* Filters row: dropdowns + skill input + diagnosed toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className={`rounded-lg border py-1.5 px-2.5 text-xs outline-none focus:border-blue-400 cursor-pointer transition-colors ${
            location ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"
          }`}
        >
          <option value="">勤務地</option>
          {PREFECTURES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
          className={`rounded-lg border py-1.5 px-2.5 text-xs outline-none focus:border-blue-400 cursor-pointer transition-colors ${
            jobType ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"
          }`}
        >
          <option value="">職種</option>
          {JOB_TYPE_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </optgroup>
          ))}
          <option value="その他">その他</option>
        </select>
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className={`rounded-lg border py-1.5 px-2.5 text-xs outline-none focus:border-blue-400 cursor-pointer transition-colors ${
            industry ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"
          }`}
        >
          <option value="">業界</option>
          {INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
        <select
          value={seekingStatus}
          onChange={(e) => setSeekingStatus(e.target.value)}
          className={`rounded-lg border py-1.5 px-2.5 text-xs outline-none focus:border-blue-400 cursor-pointer transition-colors ${
            seekingStatus
              ? "border-blue-200 bg-blue-50 text-blue-700"
              : "border-gray-200 text-gray-600"
          }`}
        >
          <option value="">転職意欲</option>
          <option value="active">スカウト歓迎</option>
          <option value="open">いい話があれば</option>
          <option value="not_seeking">スカウト不要</option>
        </select>

        <div className="h-4 w-px bg-gray-200" />

        <input
          type="text"
          placeholder="スキルを追加..."
          value={skillInput}
          onChange={(e) => setSkillInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSkill();
            }
          }}
          className="w-28 rounded-lg border border-gray-200 py-1.5 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
        />

        <button
          type="button"
          onClick={() => setDiagnosedOnly(!diagnosedOnly)}
          className={`rounded-full py-1.5 px-3 text-xs font-medium transition-all cursor-pointer ${
            diagnosedOnly
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          診断済みのみ
        </button>
      </div>

      {/* Active filter chips */}
      {(skills.length > 0 || location || industry || seekingStatus || jobType || diagnosedOnly) && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          {skills.map((s) => (
            <button
              type="button"
              key={`skill-${s}`}
              onClick={() => removeSkill(s)}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              {s}
              <ChipCloseIcon />
            </button>
          ))}
          {location && (
            <button
              type="button"
              onClick={() => setLocation("")}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              {location}
              <ChipCloseIcon />
            </button>
          )}
          {industry && (
            <button
              type="button"
              onClick={() => setIndustry("")}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              {industry}
              <ChipCloseIcon />
            </button>
          )}
          {seekingStatus && (
            <button
              type="button"
              onClick={() => setSeekingStatus("")}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              {SEEKING_STATUS_MAP[seekingStatus]?.label ?? seekingStatus}
              <ChipCloseIcon />
            </button>
          )}
          {jobType && (
            <button
              type="button"
              onClick={() => setJobType("")}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              {jobType}
              <ChipCloseIcon />
            </button>
          )}
          {diagnosedOnly && (
            <button
              type="button"
              onClick={() => setDiagnosedOnly(false)}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              診断済みのみ
              <ChipCloseIcon />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSkills([]);
              setLocation("");
              setIndustry("");
              setSeekingStatus("");
              setJobType("");
              setDiagnosedOnly(false);
            }}
            className="text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer ml-1"
          >
            すべてクリア
          </button>
        </div>
      )}
    </div>
  );
}
