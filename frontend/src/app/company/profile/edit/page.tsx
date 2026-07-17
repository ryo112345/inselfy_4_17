"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  companyProfilesDeleteCompanyProfileImage,
  companyProfilesGetCompanyProfile,
  companyProfilesUpdateCompanyProfile,
  companyProfilesUploadCompanyProfileImage,
} from "@/external/client/api/orval/generated/endpoints/company-profile/company-profile";
import type { ModelsCompanyProfileResponse as ProfileData } from "@/external/client/api/orval/generated/models";
import { getErrorMessage } from "@/lib/api-result";

type FormData = Omit<ProfileData, "id" | "email" | "logoUrl" | "coverImageUrl" | "galleryUrls">;

const employeeCountOptions = [
  "",
  "1〜10名",
  "11〜50名",
  "51〜100名",
  "101〜300名",
  "301〜500名",
  "501〜1000名",
  "1001〜5000名",
  "5001名以上",
];

const industryOptions = [
  "",
  "IT・通信",
  "Web・インターネット",
  "SaaS",
  "AI・機械学習",
  "ゲーム・エンタメ",
  "金融・フィンテック",
  "コンサルティング",
  "人材・HR",
  "広告・マーケティング",
  "メーカー・製造",
  "商社",
  "小売・流通",
  "不動産・建設",
  "医療・ヘルスケア",
  "教育",
  "エネルギー",
  "その他",
];

const smokingPolicyOptions = [
  "",
  "屋内禁煙",
  "屋内原則禁煙（喫煙室あり）",
  "敷地内禁煙",
  "敷地内禁煙（喫煙場所あり）",
  "屋内喫煙可",
  "対策なし",
];

const monthOptions = [
  { value: "", label: "月" },
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}月` })),
];

const accent = "#2979ff";

function toFormData(p: ProfileData): FormData {
  return {
    companyName: p.companyName,
    contactPersonName: p.contactPersonName,
    phoneNumber: p.phoneNumber,
    headline: p.headline,
    description: p.description,
    industry: p.industry,
    location: p.location,
    employeeCount: p.employeeCount,
    foundedYear: p.foundedYear,
    foundedMonth: p.foundedMonth,
    websiteUrl: p.websiteUrl,
    representativeName: p.representativeName,
    capital: p.capital,
    revenue: p.revenue,
    benefits: p.benefits,
    averageAge: p.averageAge,
    averageOvertimeHours: p.averageOvertimeHours,
    paidLeaveRate: p.paidLeaveRate,
    smokingPolicy: p.smokingPolicy,
  };
}

export default function CompanyProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [form, setForm] = useState<FormData>({
    companyName: "",
    contactPersonName: "",
    phoneNumber: "",
    headline: "",
    description: "",
    industry: "",
    location: "",
    employeeCount: "",
    foundedYear: null,
    foundedMonth: null,
    websiteUrl: "",
    representativeName: "",
    capital: "",
    revenue: "",
    benefits: [],
    averageAge: "",
    averageOvertimeHours: "",
    paidLeaveRate: "",
    smokingPolicy: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    companyProfilesGetCompanyProfile()
      .then((data) => {
        if (!Array.isArray(data.benefits)) data.benefits = [];
        setProfile(data);
        setForm(toFormData(data));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "foundedYear" || name === "foundedMonth"
          ? value === ""
            ? null
            : Number(value)
          : value,
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = await companyProfilesUpdateCompanyProfile(form);
      setProfile(data);
      setIsDirty(false);
      showToast("success", "プロフィールを保存しました");
    } catch (err) {
      showToast("error", getErrorMessage(err, "保存に失敗しました"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (type: "logo" | "cover" | "gallery", file: File) => {
    const setter =
      type === "logo"
        ? setLogoUploading
        : type === "cover"
          ? setCoverUploading
          : setGalleryUploading;
    setter(true);
    try {
      const data = await companyProfilesUploadCompanyProfileImage({ file }, { type });
      setProfile((prev) => {
        if (!prev) return prev;
        if (type === "logo") return { ...prev, logoUrl: data.url };
        if (type === "cover") return { ...prev, coverImageUrl: data.url };
        return { ...prev, galleryUrls: [...prev.galleryUrls, data.url] };
      });
      const labels = { logo: "ロゴ", cover: "カバー画像", gallery: "写真" };
      showToast("success", `${labels[type]}を更新しました`);
    } catch (err) {
      showToast("error", getErrorMessage(err, "アップロードに失敗しました"));
    } finally {
      setter(false);
    }
  };

  const handleImageDelete = async (type: "logo" | "cover" | "gallery", url?: string) => {
    try {
      await companyProfilesDeleteCompanyProfileImage(
        type === "gallery" ? { type, url: url ?? "" } : { type },
      );
      setProfile((prev) => {
        if (!prev) return prev;
        if (type === "logo") return { ...prev, logoUrl: "" };
        if (type === "cover") return { ...prev, coverImageUrl: "" };
        return { ...prev, galleryUrls: prev.galleryUrls.filter((u) => u !== url) };
      });
      showToast("success", "画像を削除しました");
    } catch {
      showToast("error", "削除に失敗しました");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-gray-400">読み込み中...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-red-500">プロフィールの取得に失敗しました</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pb-28">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">企業情報</h1>
        <p className="mt-1 text-sm text-gray-500">求職者に表示される企業の基本情報を編集できます</p>
      </div>

      {/* ── Cover + Logo ── */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="relative h-44 bg-gradient-to-br from-gray-100 to-gray-50">
          {profile.coverImageUrl ? (
            <Image
              src={profile.coverImageUrl}
              alt="カバー画像"
              fill
              sizes="(max-width: 672px) 100vw, 672px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <ImageIcon className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-2 text-xs text-gray-400">カバー画像を追加（16:9推奨）</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-white cursor-pointer"
            >
              {coverUploading ? <Spinner /> : <CameraIcon className="h-3.5 w-3.5" />}
              {profile.coverImageUrl ? "変更" : "追加"}
            </button>
            {profile.coverImageUrl && (
              <button
                type="button"
                onClick={() => handleImageDelete("cover")}
                className="flex items-center rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-medium text-red-500 shadow-sm backdrop-blur-sm transition-colors hover:bg-white cursor-pointer"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImageUpload("cover", f);
              e.target.value = "";
            }}
          />

          {/* Logo */}
          <div className="absolute -bottom-10 left-6">
            <div className="group relative h-20 w-20 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-sm">
              {profile.logoUrl ? (
                <Image
                  src={profile.logoUrl}
                  alt="ロゴ"
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-50">
                  <BuildingIcon className="h-7 w-7 text-gray-300" />
                </div>
              )}
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100 cursor-pointer"
              >
                {logoUploading ? (
                  <Spinner className="text-white" />
                ) : (
                  <CameraIcon className="h-5 w-5 text-white" />
                )}
              </button>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload("logo", f);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-6 pt-14 pb-5">
          <p className="text-xs text-gray-400">JPG, PNG, WebP / 5MB以下</p>
          {profile.logoUrl && (
            <button
              type="button"
              onClick={() => handleImageDelete("logo")}
              className="text-xs text-red-400 hover:text-red-500 transition-colors cursor-pointer"
            >
              ロゴを削除
            </button>
          )}
        </div>
      </section>

      {/* ── 基本情報 ── */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionTitle icon={<InfoIcon />}>基本情報</SectionTitle>
        <div className="mt-5 space-y-5">
          <Field label="企業名" required>
            <input
              name="companyName"
              value={form.companyName}
              onChange={handleChange}
              className="field-input"
              placeholder="例: 株式会社Inselfy"
            />
          </Field>
          <Field label="キャッチコピー" hint={`${form.headline.length}/100`}>
            <input
              name="headline"
              value={form.headline}
              onChange={handleChange}
              maxLength={100}
              className="field-input"
              placeholder="例: AIで採用を変える"
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="代表者名">
              <input
                name="representativeName"
                value={form.representativeName}
                onChange={handleChange}
                className="field-input"
                placeholder="例: 山田 太郎"
              />
            </Field>
            <Field label="業種">
              <select
                name="industry"
                value={form.industry}
                onChange={handleChange}
                className="field-input"
              >
                {industryOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt || "選択してください"}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <Field label="設立年">
              <select
                name="foundedYear"
                value={form.foundedYear ?? ""}
                onChange={handleChange}
                className="field-input"
              >
                <option value="">年</option>
                {Array.from(
                  { length: new Date().getFullYear() - 1899 },
                  (_, i) => new Date().getFullYear() - i,
                ).map((y) => (
                  <option key={y} value={y}>
                    {y}年
                  </option>
                ))}
              </select>
            </Field>
            <Field label="設立月">
              <select
                name="foundedMonth"
                value={form.foundedMonth ?? ""}
                onChange={handleChange}
                className="field-input"
              >
                {monthOptions.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="資本金">
              <input
                name="capital"
                value={form.capital}
                onChange={handleChange}
                className="field-input"
                placeholder="例: 1億円"
              />
            </Field>
            <Field label="売上高">
              <input
                name="revenue"
                value={form.revenue}
                onChange={handleChange}
                className="field-input"
                placeholder="例: 10億円"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="従業員規模">
              <select
                name="employeeCount"
                value={form.employeeCount}
                onChange={handleChange}
                className="field-input"
              >
                {employeeCountOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt || "選択してください"}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="所在地">
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                className="field-input"
                placeholder="例: 東京都渋谷区神宮前1-2-3"
              />
            </Field>
          </div>
          <Field label="Webサイト">
            <input
              name="websiteUrl"
              value={form.websiteUrl}
              onChange={handleChange}
              type="url"
              className="field-input"
              placeholder="例: https://example.com"
            />
          </Field>
        </div>
      </section>

      {/* ── 連絡先 ── */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionTitle icon={<ContactIcon />}>担当者・連絡先</SectionTitle>
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="担当者名">
              <input
                name="contactPersonName"
                value={form.contactPersonName}
                onChange={handleChange}
                className="field-input"
                placeholder="例: 佐藤 花子"
              />
            </Field>
            <Field label="電話番号">
              <input
                name="phoneNumber"
                value={form.phoneNumber}
                onChange={handleChange}
                type="tel"
                className="field-input"
                placeholder="例: 03-1234-5678"
              />
            </Field>
          </div>
          <Field label="メールアドレス">
            <input
              value={profile.email}
              disabled
              className="field-input bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </Field>
        </div>
      </section>

      {/* ── 事業内容 ── */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionTitle icon={<DocIcon />}>事業内容</SectionTitle>
        <div className="mt-5">
          <Field label="事業内容・企業紹介" hint={`${form.description.length}/2000`}>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              maxLength={2000}
              rows={6}
              className="field-input resize-y"
              placeholder="企業の事業内容やミッション・ビジョンなどを記載してください"
            />
          </Field>
        </div>
      </section>

      {/* ── 写真ギャラリー ── */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionTitle icon={<GalleryIcon />}>写真ギャラリー</SectionTitle>
        <p className="mt-1 text-xs text-gray-400">
          オフィスの様子やチームの雰囲気が伝わる写真を追加しましょう（最大10枚）
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {profile.galleryUrls.map((url) => (
            <div
              key={url}
              className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100"
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="(max-width: 672px) 33vw, 224px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => handleImageDelete("gallery", url)}
                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {profile.galleryUrls.length < 10 && (
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={galleryUploading}
              className="flex aspect-[4/3] flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-gray-400 transition-colors hover:border-gray-300 hover:bg-gray-50 cursor-pointer"
            >
              {galleryUploading ? (
                <Spinner />
              ) : (
                <>
                  <PlusIcon className="h-6 w-6" />
                  <span className="mt-1 text-xs">写真を追加</span>
                </>
              )}
            </button>
          )}
        </div>
        <input
          ref={galleryInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImageUpload("gallery", f);
            e.target.value = "";
          }}
        />
      </section>

      {/* ── 福利厚生 ── */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionTitle icon={<HeartIcon />}>福利厚生・待遇</SectionTitle>
        <div className="mt-5">
          <Field label="福利厚生" hint={`${form.benefits.length}件`}>
            <TagInput
              tags={form.benefits}
              onChange={(tags) => {
                setForm((prev) => ({ ...prev, benefits: tags }));
                setIsDirty(true);
              }}
              placeholder="入力してEnterで追加（例: 社会保険完備）"
            />
          </Field>
        </div>
      </section>

      {/* ── 働く環境 ── */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <SectionTitle icon={<ChartIcon />}>働く環境データ</SectionTitle>
        <p className="mt-1 mb-5 text-xs text-gray-400">
          求職者が企業を比較検討する際の重要な指標です
        </p>
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <Field label="平均年齢">
              <input
                name="averageAge"
                value={form.averageAge}
                onChange={handleChange}
                className="field-input"
                placeholder="例: 32.5歳"
              />
            </Field>
            <Field label="月平均残業時間">
              <input
                name="averageOvertimeHours"
                value={form.averageOvertimeHours}
                onChange={handleChange}
                className="field-input"
                placeholder="例: 15時間"
              />
            </Field>
            <Field label="有給取得率">
              <input
                name="paidLeaveRate"
                value={form.paidLeaveRate}
                onChange={handleChange}
                className="field-input"
                placeholder="例: 80%"
              />
            </Field>
          </div>
          <Field label="受動喫煙対策">
            <select
              name="smokingPolicy"
              value={form.smokingPolicy}
              onChange={handleChange}
              className="field-input"
            >
              {smokingPolicyOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt || "選択してください"}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* ── Sticky Save Bar ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-sm transition-all duration-300 ${isDirty ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}
      >
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
          <p className="text-sm text-gray-500">未保存の変更があります</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (profile) {
                  setForm(toFormData(profile));
                  setIsDirty(false);
                }
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 cursor-pointer"
            >
              取り消す
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-lg px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: accent }}
            >
              {isSaving ? "保存中..." : "保存する"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}
        >
          {toast.message}
        </div>
      )}

      <style>{`
        .field-input {
          display: block;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #d1d5db;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          line-height: 1.25rem;
          color: #111827;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field-input:focus {
          border-color: ${accent};
          box-shadow: 0 0 0 2px ${accent}20;
        }
        .field-input::placeholder { color: #9ca3af; }
      `}</style>
    </div>
  );
}

/* ── Sub-components ── */

function SectionTitle({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
      {icon && <span className="text-gray-400">{icon}</span>}
      {children}
    </h2>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-0.5 text-red-400">*</span>}
        </span>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function TagInput({
  tags,
  onChange,
  placeholder,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = () => {
    const value = input.trim();
    if (value && !tags.includes(value)) {
      onChange([...tags, value]);
    }
    setInput("");
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, i) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-1.5 pl-3.5 pr-2 text-sm text-gray-700"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(i)}
                className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 cursor-pointer"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            addTag();
          }
          if (e.key === "Backspace" && input === "" && tags.length > 0) {
            removeTag(tags.length - 1);
          }
        }}
        onBlur={() => {
          if (input.trim()) addTag();
        }}
        placeholder={placeholder}
        className="field-input w-full text-sm"
      />
    </div>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`h-4 w-4 animate-spin ${className}`}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path
        d="M4 12a8 8 0 018-8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-75"
      />
    </svg>
  );
}

/* ── Icons ── */

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
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
  );
}
function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 6h2M13 6h2M9 10h2M13 10h2M9 14h2M13 14h2" />
      <path d="M10 22v-4h4v4" />
    </svg>
  );
}
function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  );
}
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function InfoIcon() {
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
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 6h2M13 6h2M9 10h2M13 10h2M9 14h2M13 14h2" />
      <path d="M10 22v-4h4v4" />
    </svg>
  );
}
function ContactIcon() {
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
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function DocIcon() {
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
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
function GalleryIcon() {
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
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  );
}
function HeartIcon() {
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
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}
function ChartIcon() {
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
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}
