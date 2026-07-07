"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200/80 bg-white px-8 py-10 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]">
        <p className="text-lg font-bold text-gray-900">問題が発生しました</p>
        <p className="mt-2 text-sm text-gray-500">
          ページの読み込み中にエラーが発生しました。時間をおいて再度お試しください。
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 cursor-pointer rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          再試行
        </button>
      </div>
    </div>
  );
}
