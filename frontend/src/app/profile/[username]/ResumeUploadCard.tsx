import { DocumentIcon, PlusIcon } from "@/components/icons";

export function ResumeUploadCard() {
  return (
    <section className="relative rounded-2xl bg-white/60 px-6 py-6 text-center backdrop-blur-sm">
      <svg
        aria-hidden
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
      <button
        type="button"
        className="relative mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-6 py-3 text-base font-semibold text-white shadow-[0_4px_12px_-4px_rgba(5,95,70,0.45)] transition hover:bg-emerald-800 hover:shadow-[0_6px_16px_-4px_rgba(5,95,70,0.55)]"
      >
        <PlusIcon className="h-[18px] w-[18px]" />
        職務経歴書をアップロード
      </button>
    </section>
  );
}
