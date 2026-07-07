import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200/80 bg-white px-8 py-10 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]">
        <p className="text-5xl font-bold text-[var(--accent)]">404</p>
        <p className="mt-4 text-lg font-bold text-gray-900">ページが見つかりません</p>
        <p className="mt-2 text-sm text-gray-500">
          URLが間違っているか、ページが移動・削除された可能性があります。
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          ホームに戻る
        </Link>
      </div>
    </div>
  );
}
