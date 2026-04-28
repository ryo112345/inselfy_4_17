"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useCompanyAuth } from "@/features/company-auth/company-auth-context";

type ProfileData = {
  id: string;
  companyName: string;
  contactPersonName: string;
  phoneNumber: string;
  email: string;
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
  benefits: string;
  averageAge: string;
  averageOvertimeHours: string;
  paidLeaveRate: string;
  smokingPolicy: string;
  galleryUrls: string[];
};

const accent = "#2979ff";

type CompletenessItem = { label: string; filled: boolean };

function calcCompleteness(p: ProfileData): { percent: number; missing: string[] } {
  const items: CompletenessItem[] = [
    { label: "ロゴ", filled: !!p.logoUrl },
    { label: "カバー画像", filled: !!p.coverImageUrl },
    { label: "キャッチコピー", filled: !!p.headline },
    { label: "事業内容", filled: !!p.description },
    { label: "業種", filled: !!p.industry },
    { label: "所在地", filled: !!p.location },
    { label: "従業員規模", filled: !!p.employeeCount },
    { label: "Webサイト", filled: !!p.websiteUrl },
    { label: "写真ギャラリー", filled: p.galleryUrls.length > 0 },
    { label: "福利厚生", filled: !!p.benefits },
    { label: "代表者名", filled: !!p.representativeName },
    { label: "働く環境データ", filled: !!(p.averageAge || p.averageOvertimeHours || p.paidLeaveRate) },
  ];
  const filled = items.filter((i) => i.filled).length;
  const missing = items.filter((i) => !i.filled).map((i) => i.label);
  return { percent: Math.round((filled / items.length) * 100), missing };
}

export default function CompanyProfileViewPage() {
  const { companyFetch } = useCompanyAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    companyFetch("/api/company/profile")
      .then(async (res) => {
        if (res.ok) setProfile(await res.json());
      })
      .finally(() => setIsLoading(false));
  }, [companyFetch]);

  const handleGalleryDelete = async (url: string) => {
    try {
      const res = await companyFetch(`/api/company/profile/image?type=gallery&url=${encodeURIComponent(url)}`, { method: "DELETE" });
      if (res.ok) {
        setProfile((prev) => prev ? { ...prev, galleryUrls: prev.galleryUrls.filter((u) => u !== url) } : prev);
        showToast("success", "画像を削除しました");
      }
    } catch {
      showToast("error", "削除に失敗しました");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200" style={{ borderTopColor: accent }} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-sm text-red-500">プロフィールの取得に失敗しました</p>
      </div>
    );
  }

  const { percent, missing } = calcCompleteness(profile);
  const gallery = profile.galleryUrls;
  const hasWorkplaceData = !!(profile.averageAge || profile.averageOvertimeHours || profile.paidLeaveRate);
  const hasCompanyDetails = !!(
    profile.representativeName || profile.foundedYear || profile.capital ||
    profile.revenue || profile.smokingPolicy
  );

  const foundedText = profile.foundedYear
    ? `${profile.foundedYear}年${profile.foundedMonth ? `${profile.foundedMonth}月` : ""}`
    : null;

  return (
    <div className="pb-12">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">企業情報</h1>
          <p className="mt-0.5 text-sm text-gray-500">求職者にはこのように表示されます</p>
        </div>
        <Link
          href="/company/profile/edit"
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:opacity-90 hover:shadow-md"
          style={{ backgroundColor: accent }}
        >
          <PenIcon className="h-4 w-4" />
          編集する
        </Link>
      </div>

      {/* Completeness Banner */}
      {percent < 100 && (
        <div className="mb-6 overflow-hidden rounded-xl border bg-white shadow-sm" style={{ borderColor: `${accent}20` }}>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${accent}10` }}>
                  <span className="text-sm font-bold" style={{ color: accent }}>{percent}%</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">プロフィール完成度</p>
                  <p className="text-xs text-gray-500">情報を充実させると、求職者からの注目度が上がります</p>
                </div>
              </div>
              <Link
                href="/company/profile/edit"
                className="text-sm font-medium transition-colors hover:underline"
                style={{ color: accent }}
              >
                編集する →
              </Link>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${percent}%`, backgroundColor: accent }}
              />
            </div>
            {missing.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {missing.map((item) => (
                  <span key={item} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero Card */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Cover Image */}
        <div className="relative h-52">
          {profile.coverImageUrl ? (
            <img
              src={profile.coverImageUrl}
              alt="カバー画像"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        {/* Profile Info */}
        <div className="relative px-6 pb-6">
          {/* Logo */}
          <div className="absolute -top-11 left-6">
            <div className="h-[88px] w-[88px] overflow-hidden rounded-2xl border-4 border-white bg-white shadow-md">
              {profile.logoUrl ? (
                <img src={profile.logoUrl} alt="ロゴ" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-50">
                  <BuildingIcon className="h-8 w-8 text-gray-300" />
                </div>
              )}
            </div>
          </div>

          <div className="pt-14">
            <h2 className="text-2xl font-bold text-gray-900">{profile.companyName}</h2>
            {profile.headline && (
              <p className="mt-1 text-base text-gray-500">{profile.headline}</p>
            )}

            {/* Meta Chips */}
            <div className="mt-4 flex flex-wrap gap-2">
              {profile.industry && (
                <MetaChip icon={<TagIcon />}>{profile.industry}</MetaChip>
              )}
              {profile.location && (
                <MetaChip icon={<MapPinIcon />}>{profile.location}</MetaChip>
              )}
              {profile.employeeCount && (
                <MetaChip icon={<UsersIcon />}>{profile.employeeCount}</MetaChip>
              )}
              {foundedText && (
                <MetaChip icon={<CalendarIcon />}>設立 {foundedText}</MetaChip>
              )}
              {profile.websiteUrl && (
                <a
                  href={profile.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100"
                >
                  <LinkIcon className="h-3.5 w-3.5 text-gray-400" />
                  {profile.websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Description */}
      <section className="mt-6">
        <SectionCard title="事業内容" icon={<DocIcon />}>
          {profile.description ? (
            <p className="whitespace-pre-wrap text-base leading-8 text-gray-700">{profile.description}</p>
          ) : (
            <EmptyPrompt>事業内容やミッション・ビジョンを記載すると、求職者が企業の魅力を理解しやすくなります</EmptyPrompt>
          )}
        </SectionCard>
      </section>

      {/* Gallery + Company Details (2-column) */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Gallery */}
        <div className="md:col-span-2">
          <SectionCard title="写真ギャラリー" icon={<GalleryIcon />}>
            {gallery.length > 0 ? (
              <Gallery urls={gallery} onDelete={handleGalleryDelete} />
            ) : (
              <EmptyPrompt>オフィスの様子やチームの雰囲気が伝わる写真を追加しましょう</EmptyPrompt>
            )}
          </SectionCard>
        </div>

        {/* Company Details */}
        <div>
          <SectionCard title="企業データ" icon={<ChartIcon />}>
            {hasCompanyDetails ? (
              <dl className="space-y-3">
                {profile.representativeName && (
                  <DetailRow label="代表者" value={profile.representativeName} />
                )}
                {foundedText && <DetailRow label="設立" value={foundedText} />}
                {profile.capital && <DetailRow label="資本金" value={profile.capital} />}
                {profile.revenue && <DetailRow label="売上高" value={profile.revenue} />}
                {profile.smokingPolicy && <DetailRow label="受動喫煙対策" value={profile.smokingPolicy} />}
              </dl>
            ) : (
              <EmptyPrompt>代表者名や設立年などの企業データを追加しましょう</EmptyPrompt>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Workplace Stats */}
      <section className="mt-6">
        <SectionCard title="働く環境データ" icon={<EnvironmentIcon />}>
          {hasWorkplaceData ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {profile.averageAge && (
                <StatCard value={profile.averageAge} label="平均年齢" />
              )}
              {profile.averageOvertimeHours && (
                <StatCard value={profile.averageOvertimeHours} label="月平均残業時間" />
              )}
              {profile.paidLeaveRate && (
                <StatCard value={profile.paidLeaveRate} label="有給取得率" />
              )}
            </div>
          ) : (
            <EmptyPrompt>働く環境データは、求職者が企業を比較する際の重要な指標です</EmptyPrompt>
          )}
        </SectionCard>
      </section>

      {/* Benefits */}
      <section className="mt-6">
        <SectionCard title="福利厚生・待遇" icon={<HeartIcon />}>
          {profile.benefits ? (
            <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">{profile.benefits}</p>
          ) : (
            <EmptyPrompt>福利厚生や待遇を記載すると、求職者の応募意欲が高まります</EmptyPrompt>
          )}
        </SectionCard>
      </section>

      {/* Contact Info */}
      <section className="mt-6">
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
            <span className="text-gray-400"><ContactIcon /></span>
            <h3 className="text-base font-semibold text-gray-900">担当者・連絡先</h3>
          </div>
          <div className="flex flex-wrap items-center gap-6 px-6 py-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50">
                <UserIcon className="h-4 w-4 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">担当者</p>
                <p className="text-sm font-medium text-gray-900">{profile.contactPersonName || "—"}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-gray-100" />
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50">
                <PhoneIcon className="h-4 w-4 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">電話番号</p>
                <p className="text-sm font-medium text-gray-900">{profile.phoneNumber || "—"}</p>
              </div>
            </div>
            <div className="h-8 w-px bg-gray-100" />
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-50">
                <MailIcon className="h-4 w-4 text-gray-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">メールアドレス</p>
                <p className="text-sm font-medium text-gray-900">{profile.email}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-lg ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

/* ── Layout Components ── */

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-6 py-4">
        <span className="text-gray-400">{icon}</span>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function MetaChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-3 py-1.5 text-sm text-gray-600">
      <span className="text-gray-400">{icon}</span>
      {children}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl p-5 text-center" style={{ backgroundColor: `${accent}06` }}>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}

function EmptyPrompt({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-gray-200 py-8 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
        <PlusCircleIcon className="h-5 w-5 text-gray-300" />
      </div>
      <p className="mt-3 max-w-xs text-sm text-gray-400">{children}</p>
      <Link
        href="/company/profile/edit"
        className="mt-3 text-sm font-medium transition-colors hover:underline"
        style={{ color: accent }}
      >
        編集する
      </Link>
    </div>
  );
}

function Gallery({ urls, onDelete }: { urls: string[]; onDelete: (url: string) => void }) {
  const remaining = urls.length - 3;

  return (
    <div className="grid grid-cols-3 gap-2">
      {urls.slice(0, 3).map((url, i) => (
        <div key={url} className={`group relative overflow-hidden rounded-xl ${i === 0 && urls.length >= 3 ? "col-span-2 row-span-2" : ""}`}>
          <img src={url} alt="" className="aspect-[4/3] w-full object-cover" />
          <button
            onClick={() => onDelete(url)}
            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
          >
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
          {i === 2 && remaining > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
              <span className="text-lg font-bold text-white">+{remaining}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Icons ── */

function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function PenIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function BuildingIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 6h2M13 6h2M9 10h2M13 10h2M9 14h2M13 14h2" /><path d="M10 22v-4h4v4" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><circle cx="7" cy="7" r="1" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function LinkIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function EnvironmentIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M7 16l4-8 4 4 4-6" />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function UserIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function PhoneIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function MailIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
    </svg>
  );
}

function PlusCircleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" />
    </svg>
  );
}
