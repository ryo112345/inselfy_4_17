"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { ModelsUserResponse } from "@/external/client/api/generated";

import { updateProfile, type ApiError } from "./api";
import { CameraIcon, FaceIcon, MapPinIcon, PencilIcon, PlusIcon } from "./Icons";
import { Field, Modal, PrimaryButton, SecondaryButton } from "./Modal";

type Props = {
  user: ModelsUserResponse;
  experienceCount: number;
};

export function ProfileHeaderCard({ user, experienceCount }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]">
      {/* 緑の高さだけ変えれば境界線が動く。h-36 がコンテンツのスペーサーと対応 */}
      <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-600">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.18),transparent_55%)]" />
        <button
          type="button"
          aria-label="カバー画像を変更"
          className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm backdrop-blur hover:bg-white"
        >
          <CameraIcon className="h-[18px] w-[18px]" />
        </button>
      </div>

      <div className="relative px-7 pb-6">
        {/* h-36 スペーサー: アバター・編集ボタン・名前の位置を固定 */}
        <div className="h-36" />
        <div className="absolute top-20 left-6">
          <div className="relative">
            <div className="group flex h-36 w-36 cursor-pointer items-center justify-center rounded-full border-4 border-white bg-white shadow-[0_4px_14px_rgba(16,24,40,0.1)]">
              <FaceIcon className="h-20 w-20 text-emerald-700" />
            </div>
            <button
              type="button"
              aria-label="アバターを追加"
              className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-700 bg-white text-emerald-700 shadow-sm transition hover:bg-emerald-50"
            >
              <PlusIcon className="h-[22px] w-[22px]" />
            </button>
          </div>
        </div>

        <button
          type="button"
          aria-label="プロフィールを編集"
          onClick={() => setOpen(true)}
          className="absolute right-4 top-[188px] flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-700 bg-white text-emerald-700 transition hover:bg-emerald-50"
        >
          <PencilIcon className="h-[18px] w-[18px]" />
        </button>

        <div className="mt-24 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {user.displayName || user.name}
            </h1>
            {user.headline ? (
              <p className="mt-2 text-lg text-gray-700">{user.headline}</p>
            ) : (
              <p className="mt-2 text-lg text-gray-400">ヘッドラインを追加</p>
            )}
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
          </div>
          <div className="flex shrink-0 items-center gap-5 pb-2 text-base text-gray-500">
            <span className="inline-flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-gray-900">
                {experienceCount}
              </span>
              フォロー
            </span>
            <span className="inline-flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-gray-900">0</span>
              フォロワー
            </span>
          </div>
        </div>
      </div>

      <HeaderEditDialog
        open={open}
        onClose={() => setOpen(false)}
        user={user}
      />
    </section>
  );
}

function HeaderEditDialog({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: ModelsUserResponse;
}) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [headline, setHeadline] = useState(user.headline ?? "");
  const [location, setLocation] = useState(user.location ?? "");
  const [industry, setIndustry] = useState(user.industry ?? "");
  const [jobType, setJobType] = useState(user.jobType ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    const body = {
      name: name.trim() || undefined,
      displayName: nullIfEmpty(displayName),
      headline: nullIfEmpty(headline),
      location: nullIfEmpty(location),
      industry: nullIfEmpty(industry),
      jobType: nullIfEmpty(jobType),
    };
    // Nothing to submit if all fields are untouched.
    if (Object.values(body).every((v) => v === undefined)) {
      onClose();
      return;
    }
    startTransition(async () => {
      try {
        await updateProfile(user.username, body);
        router.refresh();
        onClose();
      } catch (e) {
        setError((e as ApiError).message);
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="プロフィールを編集"
      footer={
        <>
          <SecondaryButton onClick={onClose}>キャンセル</SecondaryButton>
          <PrimaryButton loading={pending} onClick={handleSave}>
            保存
          </PrimaryButton>
        </>
      }
    >
      <Field label="表示名" required>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
        />
      </Field>
      <Field label="フル表示名" hint="日本語など、名前とは別に使いたい表示名">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={100}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
        />
      </Field>
      <Field label="ヘッドライン" hint="例: バックエンドエンジニア">
        <input
          type="text"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          maxLength={255}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
        />
      </Field>
      <Field label="居住地">
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={100}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
        />
      </Field>
      <Field label="業界">
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
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
      <Field label="職種">
        <select
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
        >
          <option value="">選択してください</option>
          <option>バックエンドエンジニア</option>
          <option>フロントエンドエンジニア</option>
          <option>フルスタックエンジニア</option>
          <option>インフラエンジニア / SRE</option>
          <option>データサイエンティスト / MLエンジニア</option>
          <option>モバイルエンジニア</option>
          <option>セキュリティエンジニア</option>
          <option>QAエンジニア</option>
          <option>その他エンジニア</option>
          <option>UI / UXデザイナー</option>
          <option>グラフィックデザイナー</option>
          <option>プロダクトマネージャー</option>
          <option>プロジェクトマネージャー</option>
          <option>営業 / セールス</option>
          <option>マーケティング</option>
          <option>カスタマーサクセス</option>
          <option>事業開発 / 戦略</option>
          <option>コンサルタント</option>
          <option>人事 / 採用</option>
          <option>法務 / コンプライアンス</option>
          <option>経営 / マネジメント</option>
          <option>研究 / R&D</option>
          <option>その他</option>
        </select>
      </Field>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </Modal>
  );
}

// nullIfEmpty translates empty input into explicit null so the backend clears
// the field; non-empty input becomes the trimmed string.
function nullIfEmpty(s: string): string | null {
  const trimmed = s.trim();
  return trimmed === "" ? null : trimmed;
}
