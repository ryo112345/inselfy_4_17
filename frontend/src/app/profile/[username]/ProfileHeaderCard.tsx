"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  CameraIcon,
  FaceIcon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  XIcon,
} from "@/components/icons";
import { Field, PrimaryButton, SecondaryButton } from "@/components/ui";
import type { ModelsUserResponse } from "@/external/client/api/generated";
import { type ApiError, updateProfile, uploadProfileImage } from "./api";
import { FollowButton } from "./FollowButton";
import { ImageCropModal } from "./ImageCropModal";

const PRESET_COLORS = [
  "#3D8B6E",
  "#059669",
  "#0D9488",
  "#0891B2",
  "#2563EB",
  "#4F46E5",
  "#7C3AED",
  "#DB2777",
  "#E11D48",
  "#DC2626",
  "#D97706",
  "#D68B6B",
  "#65A30D",
  "#64748B",
  "#1E293B",
];

const JOB_SEEKING_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "スカウト歓迎", color: "bg-emerald-100 text-emerald-800" },
  open: { label: "いい話があれば", color: "bg-amber-100 text-amber-800" },
  not_seeking: { label: "スカウト不要", color: "bg-gray-100 text-gray-600" },
};

type Props = {
  user: ModelsUserResponse;
  experienceCount: number;
  followersCount: number;
  followingCount: number;
  isOwner?: boolean;
};

export function ProfileHeaderCard({
  user,
  experienceCount,
  followersCount,
  followingCount,
  isOwner = true,
}: Props) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [headline, setHeadline] = useState(user.headline ?? "");
  const [location, setLocation] = useState(user.location ?? "");
  const [industry, setIndustry] = useState(user.industry ?? "");
  const [jobType, setJobType] = useState(user.jobType ?? "");
  const [jobSeekingStatus, setJobSeekingStatus] = useState(user.jobSeekingStatus ?? "");
  const [profileColor, setProfileColor] = useState(user.profileColor ?? "#3D8B6E");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropType, setCropType] = useState<"avatar" | "cover">("avatar");

  const handleFileSelect = (file: File, type: "avatar" | "cover") => {
    const url = URL.createObjectURL(file);
    setCropType(type);
    setCropSrc(url);
  };

  const handleCropConfirm = async (blob: Blob) => {
    setCropSrc(null);
    setUploading(true);
    try {
      const ext = cropType === "cover" ? "cover.jpg" : "avatar.jpg";
      const file = new File([blob], ext, { type: "image/jpeg" });
      await uploadProfileImage(user.username, file, cropType);
      router.refresh();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setUploading(false);
    }
  };

  const handleCropClose = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const handleImageDelete = async (type: "avatar" | "cover") => {
    setUploading(true);
    try {
      const body = type === "avatar" ? { avatarUrl: null } : { coverPhotoUrl: null };
      await updateProfile(user.username, body);
      router.refresh();
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = () => {
    setError(null);
    const body = {
      name: name.trim() || undefined,
      headline: nullIfEmpty(headline),
      location: nullIfEmpty(location),
      industry: nullIfEmpty(industry),
      jobType: nullIfEmpty(jobType),
      jobSeekingStatus: nullIfEmpty(jobSeekingStatus),
      profileColor,
    };
    startTransition(async () => {
      try {
        await updateProfile(user.username, body);
        router.refresh();
        setIsEditing(false);
      } catch (e) {
        setError((e as ApiError).message);
      }
    });
  };

  const handleCancel = () => {
    setName(user.name);
    setHeadline(user.headline ?? "");
    setLocation(user.location ?? "");
    setIndustry(user.industry ?? "");
    setJobType(user.jobType ?? "");
    setJobSeekingStatus(user.jobSeekingStatus ?? "");
    setProfileColor(user.profileColor ?? "#3D8B6E");
    setError(null);
    setIsEditing(false);
  };

  const headerColor = isEditing ? profileColor : (user.profileColor ?? "#3D8B6E");
  const jobStatus = user.jobSeekingStatus ? JOB_SEEKING_LABELS[user.jobSeekingStatus] : null;
  const avatarSrc = user.avatarUrl?.replace("=s96-c", "=s400-c") ?? null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]">
      <div
        className="absolute inset-x-0 top-0 z-10 h-32 md:h-44 overflow-hidden"
        style={{ background: user.coverPhotoUrl ? undefined : headerColor }}
      >
        {user.coverPhotoUrl ? (
          <img src={user.coverPhotoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_30%,rgba(255,255,255,0.10),transparent_60%)]" />
        )}
        {isOwner && (
          <>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file, "cover");
                e.target.value = "";
              }}
            />
            {user.coverPhotoUrl && (
              <button
                type="button"
                aria-label="カバー画像を削除"
                disabled={uploading}
                onClick={() => handleImageDelete("cover")}
                className="absolute top-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur hover:bg-black/50 disabled:opacity-50"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              aria-label="カバー画像を変更"
              disabled={uploading}
              onClick={() => coverInputRef.current?.click()}
              className="absolute bottom-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/20 text-white backdrop-blur hover:bg-black/30 disabled:opacity-50"
            >
              <CameraIcon className="h-[18px] w-[18px]" />
            </button>
          </>
        )}
      </div>

      <div className="relative px-4 md:px-7 pb-6">
        <div className="pointer-events-none h-[120px] md:h-36" />
        <div className="absolute top-14 md:top-20 left-4 md:left-6 z-20">
          <div className="relative">
            <div className="group flex h-24 w-24 md:h-36 md:w-36 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white shadow-[0_4px_14px_rgba(16,24,40,0.1)]">
              {avatarSrc ? (
                <img src={avatarSrc} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <FaceIcon className="h-14 w-14 md:h-20 md:w-20" style={{ color: headerColor }} />
              )}
            </div>
            {isOwner && (
              <>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, "avatar");
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  aria-label={user.avatarUrl ? "アバターを変更" : "アバターを追加"}
                  disabled={uploading}
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-7 w-7 md:h-10 md:w-10 items-center justify-center rounded-full border-2 bg-white shadow-sm transition hover:opacity-80 disabled:opacity-50"
                  style={{ borderColor: headerColor, color: headerColor }}
                >
                  {user.avatarUrl ? (
                    <CameraIcon className="h-3.5 w-3.5 md:h-[18px] md:w-[18px]" />
                  ) : (
                    <PlusIcon className="h-4 w-4 md:h-[22px] md:w-[22px]" />
                  )}
                </button>
                {user.avatarUrl && (
                  <button
                    type="button"
                    aria-label="アバターを削除"
                    disabled={uploading}
                    onClick={() => handleImageDelete("avatar")}
                    className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-600 text-white shadow-sm transition hover:bg-gray-700 disabled:opacity-50"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {isOwner && !isEditing && (
          <button
            type="button"
            aria-label="プロフィールを編集"
            onClick={() => setIsEditing(true)}
            className="absolute right-4 top-[148px] md:top-[188px] flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white transition hover:opacity-80"
            style={{ borderColor: headerColor, color: headerColor }}
          >
            <PencilIcon className="h-[18px] w-[18px]" />
          </button>
        )}
        {!isOwner && !isEditing && (
          <div className="absolute right-4 top-[136px] md:top-[188px] flex items-center gap-2">
            <button
              type="button"
              aria-label="メッセージを送る"
              onClick={() =>
                router.push(
                  `/messages?recipient=${user.id}&recipientName=${encodeURIComponent(user.name)}`,
                )
              }
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white transition hover:opacity-80"
              style={{ borderColor: headerColor, color: headerColor }}
            >
              <MailIcon className="h-[18px] w-[18px]" />
            </button>
            <FollowButton username={user.username} profileColor={headerColor} />
          </div>
        )}

        {isEditing ? (
          <div className="mt-12 md:mt-20">
            <div className="flex flex-col md:flex-row md:flex-wrap gap-4">
              <div className="md:flex-1 md:min-w-[140px]">
                <Field label="表示名" required>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
                  />
                </Field>
              </div>
              <div className="md:w-[160px] md:shrink-0">
                <Field label="スカウト">
                  <select
                    value={jobSeekingStatus}
                    onChange={(e) => setJobSeekingStatus(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="">選択してください</option>
                    <option value="active">スカウト歓迎</option>
                    <option value="open">いい話があれば</option>
                    <option value="not_seeking">スカウト不要</option>
                  </select>
                </Field>
              </div>
            </div>
            <Field label="ヘッドライン" hint="例: シニアバックエンドエンジニア / 決済基盤リード">
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                maxLength={255}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
              />
            </Field>
            <div className="flex flex-col md:flex-row md:flex-wrap gap-4">
              <div className="md:flex-1 md:min-w-[140px]">
                <Field label="居住地">
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="">選択してください</option>
                    <option>北海道</option>
                    <option>青森県</option>
                    <option>岩手県</option>
                    <option>宮城県</option>
                    <option>秋田県</option>
                    <option>山形県</option>
                    <option>福島県</option>
                    <option>茨城県</option>
                    <option>栃木県</option>
                    <option>群馬県</option>
                    <option>埼玉県</option>
                    <option>千葉県</option>
                    <option>東京都</option>
                    <option>神奈川県</option>
                    <option>新潟県</option>
                    <option>富山県</option>
                    <option>石川県</option>
                    <option>福井県</option>
                    <option>山梨県</option>
                    <option>長野県</option>
                    <option>岐阜県</option>
                    <option>静岡県</option>
                    <option>愛知県</option>
                    <option>三重県</option>
                    <option>滋賀県</option>
                    <option>京都府</option>
                    <option>大阪府</option>
                    <option>兵庫県</option>
                    <option>奈良県</option>
                    <option>和歌山県</option>
                    <option>鳥取県</option>
                    <option>島根県</option>
                    <option>岡山県</option>
                    <option>広島県</option>
                    <option>山口県</option>
                    <option>徳島県</option>
                    <option>香川県</option>
                    <option>愛媛県</option>
                    <option>高知県</option>
                    <option>福岡県</option>
                    <option>佐賀県</option>
                    <option>長崎県</option>
                    <option>熊本県</option>
                    <option>大分県</option>
                    <option>宮崎県</option>
                    <option>鹿児島県</option>
                    <option>沖縄県</option>
                    <option>海外</option>
                  </select>
                </Field>
              </div>
              <div className="md:flex-1 md:min-w-[160px]">
                <Field label="業界">
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="">選択してください</option>
                    <option>EC・小売テック</option>
                    <option>IT・通信</option>
                    <option>エネルギー・環境</option>
                    <option>ゲーム・エンタメ</option>
                    <option>スポーツ・ウェルネス</option>
                    <option>セキュリティ・サイバーセキュリティ</option>
                    <option>デザイン・広告</option>
                    <option>ファッション・アパレルテック</option>
                    <option>ペット・動物関連</option>
                    <option>メディア・出版</option>
                    <option>モビリティ・自動車</option>
                    <option>人材・HR</option>
                    <option>介護・福祉テック</option>
                    <option>保険・インシュアテック</option>
                    <option>医療・ヘルスケア</option>
                    <option>地方創生・まちづくり</option>
                    <option>宇宙・航空</option>
                    <option>建設・不動産テック</option>
                    <option>教育・EdTech</option>
                    <option>旅行・観光テック</option>
                    <option>法律・リーガルテック</option>
                    <option>物流・ロジスティクス</option>
                    <option>製造業・ものづくり</option>
                    <option>農業・食品</option>
                    <option>農業機械・アグリテック</option>
                    <option>金融・フィンテック</option>
                    <option>防災・災害対策テック</option>
                    <option>音楽・クリエイティブテック</option>
                    <option>食品・フードテック</option>
                  </select>
                </Field>
              </div>
              <div className="md:flex-1 md:min-w-[160px]">
                <Field label="職種">
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
                  >
                    <option value="">選択してください</option>
                    <optgroup label="エンジニアリング">
                      <option>バックエンドエンジニア</option>
                      <option>フロントエンドエンジニア</option>
                      <option>フルスタックエンジニア</option>
                      <option>モバイルエンジニア（iOS）</option>
                      <option>モバイルエンジニア（Android）</option>
                      <option>モバイルエンジニア（クロスプラットフォーム）</option>
                      <option>インフラエンジニア / SRE</option>
                      <option>クラウドエンジニア</option>
                      <option>DevOpsエンジニア</option>
                      <option>組み込み / ファームウェアエンジニア</option>
                      <option>セキュリティエンジニア</option>
                      <option>QAエンジニア / テストエンジニア</option>
                      <option>ゲームエンジニア</option>
                      <option>AR / VRエンジニア</option>
                      <option>ブロックチェーンエンジニア</option>
                      <option>その他エンジニア</option>
                    </optgroup>
                    <optgroup label="データ / AI">
                      <option>データサイエンティスト</option>
                      <option>機械学習エンジニア / MLエンジニア</option>
                      <option>AIエンジニア</option>
                      <option>データエンジニア</option>
                      <option>データアナリスト</option>
                      <option>ビジネスインテリジェンス（BI）エンジニア</option>
                      <option>リサーチサイエンティスト</option>
                    </optgroup>
                    <optgroup label="デザイン">
                      <option>UI / UXデザイナー</option>
                      <option>プロダクトデザイナー</option>
                      <option>グラフィックデザイナー</option>
                      <option>ブランドデザイナー</option>
                      <option>モーションデザイナー</option>
                      <option>3Dデザイナー</option>
                      <option>イラストレーター</option>
                    </optgroup>
                    <optgroup label="プロダクト / プロジェクト">
                      <option>プロダクトマネージャー</option>
                      <option>プロジェクトマネージャー</option>
                      <option>スクラムマスター / アジャイルコーチ</option>
                      <option>テクニカルプロダクトマネージャー</option>
                    </optgroup>
                    <optgroup label="ビジネス / セールス">
                      <option>営業 / セールス</option>
                      <option>インサイドセールス</option>
                      <option>フィールドセールス</option>
                      <option>カスタマーサクセス</option>
                      <option>カスタマーサポート</option>
                      <option>事業開発 / 戦略</option>
                      <option>アライアンス / パートナーセールス</option>
                    </optgroup>
                    <optgroup label="マーケティング">
                      <option>マーケティング</option>
                      <option>デジタルマーケティング</option>
                      <option>コンテンツマーケティング</option>
                      <option>SEO / SEM スペシャリスト</option>
                      <option>グロースハッカー</option>
                      <option>広報 / PR</option>
                      <option>ブランドマネージャー</option>
                    </optgroup>
                    <optgroup label="コーポレート">
                      <option>人事 / 採用</option>
                      <option>HRBPパートナー</option>
                      <option>財務 / 経理</option>
                      <option>法務 / コンプライアンス</option>
                      <option>内部監査</option>
                      <option>購買 / 調達</option>
                      <option>総務 / 施設管理</option>
                      <option>情報システム / 社内SE</option>
                    </optgroup>
                    <optgroup label="クリエイティブ">
                      <option>コピーライター</option>
                      <option>編集者 / エディター</option>
                      <option>フォトグラファー</option>
                      <option>動画クリエイター / 映像編集</option>
                      <option>サウンドデザイナー</option>
                    </optgroup>
                    <optgroup label="マネジメント / 経営">
                      <option>経営 / マネジメント</option>
                      <option>コンサルタント</option>
                      <option>研究 / R&D</option>
                      <option>アナリスト</option>
                    </optgroup>
                    <optgroup label="製造 / オペレーション">
                      <option>生産管理</option>
                      <option>品質管理 / QC</option>
                      <option>サプライチェーン / 物流</option>
                      <option>設計 / 機械エンジニア</option>
                      <option>電気 / 電子エンジニア</option>
                    </optgroup>
                    <option>その他</option>
                  </select>
                </Field>
              </div>
            </div>
            <div className="mb-4">
              <span className="mb-2 block text-sm font-semibold text-gray-700">
                プロフィールカラー
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    onClick={() => setProfileColor(color)}
                    className="h-8 w-8 rounded-full border-2 transition"
                    style={{
                      backgroundColor: color,
                      borderColor: profileColor === color ? "#111" : "transparent",
                      outline: profileColor === color ? "2px solid #fff" : "none",
                      outlineOffset: "-3px",
                    }}
                  />
                ))}
              </div>
            </div>
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <SecondaryButton onClick={handleCancel}>キャンセル</SecondaryButton>
              <PrimaryButton loading={pending} onClick={handleSave}>
                保存
              </PrimaryButton>
            </div>
          </div>
        ) : (
          <div className="mt-14 md:mt-24">
            {/* 名前行 */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">
                  {user.name}
                </h1>
                {jobStatus ? (
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${jobStatus.color}`}
                  >
                    {jobStatus.label}
                  </span>
                ) : null}
              </div>
              {user.headline ? (
                <p className="mt-2 text-lg text-gray-700">{user.headline}</p>
              ) : isOwner ? (
                <p className="mt-2 text-lg text-gray-400">ヘッドラインを追加</p>
              ) : null}
            </div>

            {/* タグ行 */}
            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-base text-gray-500">
              {user.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPinIcon className="h-[18px] w-[18px]" />
                  {user.location}
                </span>
              ) : null}
              {user.industry ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                  {user.industry}
                </span>
              ) : null}
              {user.jobType ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                  {user.jobType}
                </span>
              ) : null}
            </div>

            {/* 統計行 */}
            <div className="mt-4 flex items-center gap-5 border-t border-gray-100 pt-4 text-base text-gray-500">
              <span className="inline-flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-gray-900">{followingCount}</span>
                フォロー
              </span>
              <span className="inline-flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-gray-900">{followersCount}</span>
                フォロワー
              </span>
            </div>
          </div>
        )}
      </div>

      {cropSrc && (
        <ImageCropModal
          open
          imageSrc={cropSrc}
          aspect={cropType === "cover" ? 16 / 5 : 1}
          title={cropType === "cover" ? "カバー画像を調整" : "アバターを調整"}
          onClose={handleCropClose}
          onConfirm={handleCropConfirm}
        />
      )}
    </section>
  );
}

function nullIfEmpty(s: string): string | null {
  const trimmed = s.trim();
  return trimmed === "" ? null : trimmed;
}
