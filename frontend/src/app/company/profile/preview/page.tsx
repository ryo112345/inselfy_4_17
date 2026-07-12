"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { TeamScoresSection } from "@/app/companies/[id]/TeamScoresSection";
import { ACCENT } from "@/constants/theme";
import { useCompanyAuth } from "@/features/company-auth/company-auth-context";
import {
  fetchPublicTeamScores,
  type PublicTeamScore as TeamScore,
} from "@/features/company-profile/api";

type ProfileData = {
  id: string;
  companyName: string;
  headline: string;
  description: string;
  industry: string;
  location: string;
  employeeCount: string;
  foundedYear: number | null;
  foundedMonth: number | null;
  websiteUrl: string;
  logoUrl: string;
  coverImageUrl: string;
  representativeName: string;
  capital: string;
  revenue: string;
  benefits: string[];
  averageAge: string;
  averageOvertimeHours: string;
  paidLeaveRate: string;
  smokingPolicy: string;
  galleryUrls: string[];
};

const cardClass =
  "rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]";

export default function CompanyProfilePreviewPage() {
  const { companyFetch } = useCompanyAuth();
  const [company, setCompany] = useState<ProfileData | null>(null);
  const [teamScores, setTeamScores] = useState<TeamScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    companyFetch("/api/company/profile")
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (!Array.isArray(data.benefits)) data.benefits = [];
          setCompany(data);
          fetchPublicTeamScores(data.id)
            .then(setTeamScores)
            .catch(() => {});
        }
      })
      .finally(() => setIsLoading(false));
  }, [companyFetch]);

  useEffect(() => {
    const channel = new BroadcastChannel("company-profile-preview");
    channel.onmessage = (e) => {
      const data = e.data;
      if (!Array.isArray(data.benefits)) data.benefits = [];
      setCompany(data);
    };
    return () => {
      channel.close();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f5]">
        <div className="text-sm text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f5]">
        <div className="text-sm text-red-500">プロフィールの取得に失敗しました</div>
      </div>
    );
  }

  const foundedText = company.foundedYear
    ? `${company.foundedYear}年${company.foundedMonth ? `${company.foundedMonth}月` : ""}`
    : null;

  const statItems = [
    company.averageAge && { value: company.averageAge, label: "平均年齢" },
    company.averageOvertimeHours && { value: company.averageOvertimeHours, label: "月平均残業" },
    company.paidLeaveRate && { value: company.paidLeaveRate, label: "有給取得率" },
  ].filter(Boolean) as { value: string; label: string }[];

  const detailItems = [
    company.representativeName && { label: "代表者", value: company.representativeName },
    foundedText && { label: "設立", value: foundedText },
    company.employeeCount && { label: "従業員数", value: company.employeeCount },
    company.capital && { label: "資本金", value: company.capital },
    company.revenue && { label: "売上高", value: company.revenue },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="min-h-screen bg-[#f6f7f5]">
      {/* Preview Banner */}
      <div className="sticky top-0 z-30 border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-center text-sm text-amber-800">
        この画面はプレビューです。求職者にはこのように表示されます。
      </div>

      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 pb-20 pt-8">
        {/* Hero */}
        <section className={`overflow-hidden ${cardClass}`}>
          <div className="relative overflow-hidden">
            {company.coverImageUrl ? (
              <Image
                src={company.coverImageUrl}
                alt=""
                width={1600}
                height={900}
                sizes="(max-width: 768px) 100vw, 736px"
                className="h-auto w-full"
              />
            ) : (
              <div className="h-44 sm:h-56" style={{ background: ACCENT }}>
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_30%,rgba(255,255,255,0.10),transparent_60%)]" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
          </div>

          <div className="relative px-7 pb-6">
            <div className="absolute -top-10 left-7">
              <div className="relative h-20 w-20 overflow-hidden rounded-xl border-4 border-white bg-white shadow-[0_4px_14px_rgba(16,24,40,0.1)]">
                {company.logoUrl ? (
                  <Image src={company.logoUrl} alt="" fill sizes="80px" className="object-cover" />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{ background: `${ACCENT}20` }}
                  >
                    <span className="text-xl font-bold" style={{ color: ACCENT }}>
                      {company.companyName.charAt(0)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-14">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                {company.companyName}
              </h1>
              {company.headline && (
                <p className="mt-1.5 text-lg text-gray-700">{company.headline}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2.5 text-sm text-gray-500">
                {company.industry && (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                    {company.industry}
                  </span>
                )}
                {company.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPinIcon />
                    {company.location}
                  </span>
                )}
              </div>

              {company.websiteUrl && (
                <a
                  href={company.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800"
                >
                  <LinkIcon />
                  {company.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  <ExternalIcon />
                </a>
              )}
            </div>
          </div>
        </section>

        {/* About */}
        {company.description && (
          <section className={`px-6 py-5 ${cardClass}`}>
            <h2 className="border-l-[3px] border-emerald-600 pl-3 text-xl font-bold text-gray-900">
              事業内容
            </h2>
            <div className="mt-3">
              <ExpandableText text={company.description} maxLines={6} />
            </div>
          </section>
        )}

        {/* Team Diagnosis */}
        <TeamScoresSection teams={teamScores} cardClass={cardClass} />

        {/* Gallery */}
        {company.galleryUrls.length > 0 && (
          <section className={`overflow-hidden ${cardClass}`}>
            <div className="px-6 pb-2 pt-5">
              <h2 className="border-l-[3px] border-emerald-600 pl-3 text-xl font-bold text-gray-900">
                フォトギャラリー
              </h2>
            </div>
            <Gallery urls={company.galleryUrls} />
          </section>
        )}

        {/* Workplace Stats */}
        {statItems.length > 0 && (
          <section className={`py-5 ${cardClass}`}>
            <div className="px-6">
              <h2 className="border-l-[3px] border-emerald-600 pl-3 text-xl font-bold text-gray-900">
                数字で見る働く環境
              </h2>
            </div>
            <div className="mt-5 grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {statItems.map(({ value, label }) => (
                <div key={label} className="px-6 py-4 text-center sm:py-2">
                  <p className="text-3xl font-bold" style={{ color: ACCENT }}>
                    {value}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Benefits */}
        {(company.benefits.length > 0 || company.smokingPolicy) && (
          <section className={`px-6 py-5 ${cardClass}`}>
            <h2 className="border-l-[3px] border-emerald-600 pl-3 text-xl font-bold text-gray-900">
              福利厚生・待遇
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {company.benefits.map((b) => (
                <li
                  key={b}
                  className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium"
                  style={{
                    borderColor: `${ACCENT}40`,
                    backgroundColor: `${ACCENT}12`,
                    color: ACCENT,
                  }}
                >
                  {b}
                </li>
              ))}
              {company.smokingPolicy && (
                <li
                  className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium"
                  style={{
                    borderColor: `${ACCENT}40`,
                    backgroundColor: `${ACCENT}12`,
                    color: ACCENT,
                  }}
                >
                  {company.smokingPolicy}
                </li>
              )}
            </ul>
          </section>
        )}

        {/* Company Details */}
        {detailItems.length > 0 && (
          <section className={`overflow-hidden py-5 ${cardClass}`}>
            <div className="px-6">
              <h2 className="border-l-[3px] border-emerald-600 pl-3 text-xl font-bold text-gray-900">
                企業情報
              </h2>
            </div>
            <dl className="mt-4">
              {detailItems.map(({ label, value }, i) => (
                <div
                  key={label}
                  className={`flex items-baseline justify-between px-6 py-3.5 ${i % 2 === 0 ? "bg-gray-50/70" : ""}`}
                >
                  <dt className="shrink-0 text-base text-gray-500">{label}</dt>
                  <dd className="text-right text-base font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </div>
  );
}

/* ── Components ── */

function ExpandableText({ text, maxLines = 6 }: { text: string; maxLines?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: text 変更時に行数を再計測するための意図的な依存
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    setNeedsExpansion(el.scrollHeight > lineHeight * maxLines + lineHeight * 0.5);
  }, [text, maxLines]);

  return (
    <div>
      <p
        ref={ref}
        className="whitespace-pre-wrap text-base leading-relaxed text-gray-800"
        style={
          !expanded && needsExpansion
            ? {
                display: "-webkit-box",
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
              }
            : undefined
        }
      >
        {text}
      </p>
      {needsExpansion && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-3 cursor-pointer text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-800"
        >
          {expanded ? "閉じる" : "続きを読む"}
        </button>
      )}
    </div>
  );
}

function Gallery({ urls }: { urls: string[] }) {
  const [current, setCurrent] = useState(0);
  const prev = () => setCurrent((c) => (c - 1 + urls.length) % urls.length);
  const next = () => setCurrent((c) => (c + 1) % urls.length);

  return (
    <div>
      <div className="group relative aspect-video overflow-hidden bg-gray-100">
        <Image
          src={urls[current]}
          alt=""
          fill
          sizes="(max-width: 768px) 100vw, 736px"
          className="object-contain"
        />
        {urls.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm opacity-0 transition-all hover:bg-white group-hover:opacity-100"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm opacity-0 transition-all hover:bg-white group-hover:opacity-100"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}
        {urls.length > 1 && (
          <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white">
            {current + 1} / {urls.length}
          </div>
        )}
      </div>
      {urls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {urls.map((url, i) => (
            <button
              type="button"
              key={url}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 cursor-pointer overflow-hidden rounded-lg transition-opacity ${i === current ? "opacity-100" : "opacity-40 hover:opacity-70"}`}
              style={
                i === current ? { outline: `2px solid ${ACCENT}`, outlineOffset: "1px" } : undefined
              }
            >
              <Image src={url} alt="" width={80} height={56} className="h-14 w-20 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Icons ── */

function MapPinIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function LinkIcon() {
  return (
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
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3 w-3"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
