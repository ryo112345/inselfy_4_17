"use client";

import { useEffect, useRef, useState } from "react";
import { DocumentIcon, PlusIcon } from "@/components/icons";
import { type ApiError, fetchMyResume, type ResumeUpload, uploadResume } from "./api";

const MAX_SIZE = 5 * 1024 * 1024;

// アップロード済み（pending/reviewing）の間は再アップロード不可のため
// ステータスカードに切り替える。approved/rejected は再アップロード可。
export function ResumeUploadCard() {
  const [upload, setUpload] = useState<ResumeUpload | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyResume()
      .then((up) => {
        if (!cancelled) setUpload(up ?? null);
      })
      .catch(() => {
        // 取得失敗時はアップロードUIを出す（送信時のエラーで拾える）
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > MAX_SIZE) {
      setError("ファイルサイズは5MB以下にしてください");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const up = await uploadResume(file);
      setUpload(up);
    } catch (err) {
      setError((err as ApiError).message ?? "アップロードに失敗しました");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  if (!loaded) return null;

  const processing = upload && (upload.status === "pending" || upload.status === "reviewing");

  return (
    <section className="relative rounded-2xl bg-white/60 px-6 py-6 text-center backdrop-blur-sm">
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
      >
        <rect
          x={1}
          y={1}
          width="calc(100% - 2px)"
          height="calc(100% - 2px)"
          rx={16}
          ry={16}
          fill="none"
          stroke="#d6d9de"
          strokeWidth={2}
          strokeDasharray="5 6"
          strokeLinecap="round"
        />
      </svg>
      <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e5ede7] text-emerald-700">
        <DocumentIcon className="h-8 w-8" />
      </div>

      {processing ? (
        <>
          <h2 className="relative mt-4 text-lg md:text-xl font-bold leading-snug tracking-tight text-gray-900">
            職務経歴書を確認中です
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-sm md:text-base leading-relaxed text-gray-500">
            {upload.originalFilename} をお預かりしました。
            <br className="hidden md:inline" />
            内容の反映が完了するとお知らせします。
          </p>
          <span className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-sm font-semibold text-amber-700">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            確認中
          </span>
        </>
      ) : (
        <>
          <h2 className="relative mt-4 text-lg md:text-xl font-bold leading-snug tracking-tight text-gray-900">
            職務経歴書をアップロードするだけで、
            <br className="hidden md:inline" />
            プロフィールが完成します
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-sm md:text-base leading-relaxed text-gray-500">
            PDF形式の職務経歴書をお持ちなら、アップロードするだけ。
            <br className="hidden md:inline" />
            職歴・スキル・自己紹介を自動で反映します。
          </p>
          {upload?.status === "approved" && (
            <p className="relative mt-2 text-sm text-emerald-700">
              前回の職務経歴書はプロフィールに反映済みです。再アップロードもできます。
            </p>
          )}
          {upload?.status === "rejected" && (
            <p className="relative mt-2 text-sm text-red-600">
              前回のアップロードは反映されませんでした。ファイルを確認して再アップロードしてください。
            </p>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="relative mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-[0_4px_12px_-4px_rgba(5,95,70,0.45)] transition hover:bg-emerald-800 hover:shadow-[0_6px_16px_-4px_rgba(5,95,70,0.55)] disabled:opacity-60"
          >
            <PlusIcon className="h-[18px] w-[18px]" />
            {uploading ? "アップロード中…" : "職務経歴書をアップロード"}
          </button>
          {error && <p className="relative mt-3 text-sm text-red-600">{error}</p>}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={handleFile}
            className="hidden"
          />
        </>
      )}
    </section>
  );
}
