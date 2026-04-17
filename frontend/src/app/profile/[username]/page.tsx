import { notFound } from "next/navigation";
import "@/external/client/api/client";
import {
  type ModelsUserResponse,
  usersGetUserByUsername,
} from "@/external/client/api/generated";
import { PostsTabs } from "./PostsTabs";
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const { data, error } = await usersGetUserByUsername({
    path: { username },
  });

  if (error || !data) notFound();
  const user = data as unknown as ModelsUserResponse;

  return (
    <main className="min-h-screen bg-[#f6f7f5] px-4 py-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-5">
        <ProfileHeaderCard name={user.name} />
        <AiReportCard />
        <ResumeUploadCard />
        <SkillsCard />
        <ExperienceCard />
        <EducationCard />
        <AboutCard />
        <PostsTabs />
      </div>
    </main>
  );
}

function SkillsCard() {
  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <AwardIcon className="h-5 w-5 text-gray-900" />
          スキル
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="スキルを入力"
            className="h-10 w-44 rounded-full border border-gray-200 bg-white px-4 text-sm text-gray-700 placeholder:text-gray-400 focus:border-emerald-600 focus:outline-none"
          />
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            追加
          </button>
        </div>
      </div>
      <p className="mt-4 text-base leading-relaxed text-gray-500">
        スキルを追加して、あなたの強みをアピールしましょう。
      </p>
    </section>
  );
}

function ExperienceCard() {
  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <BriefcaseIcon className="h-5 w-5 text-gray-900" />
          職歴
        </h2>
        <button
          type="button"
          aria-label="職歴を追加"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm transition hover:bg-emerald-800"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>
      <button
        type="button"
        className="mt-4 block w-full rounded-xl border-2 border-dashed border-[#d6d9de] bg-white bg-clip-padding py-4 text-center text-base font-semibold leading-relaxed text-emerald-700 transition hover:border-emerald-700 hover:bg-emerald-50"
      >
        + 職歴を追加して、キャリアをアピールしましょう。
      </button>
    </section>
  );
}

function EducationCard() {
  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <CapIcon className="h-5 w-5 text-gray-900" />
          学歴
        </h2>
        <button
          type="button"
          aria-label="学歴を追加"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm transition hover:bg-emerald-800"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>
      <button
        type="button"
        className="mt-4 block w-full rounded-xl border-2 border-dashed border-[#d6d9de] bg-white bg-clip-padding py-4 text-center text-base font-semibold leading-relaxed text-emerald-700 transition hover:border-emerald-700 hover:bg-emerald-50"
      >
        + 学歴を追加しましょう。
      </button>
    </section>
  );
}

function AboutCard() {
  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">自己紹介</h2>
        <button
          type="button"
          aria-label="自己紹介を編集"
          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-700 bg-white text-emerald-700 transition hover:bg-emerald-50"
        >
          <PencilIcon className="h-[18px] w-[18px]" />
        </button>
      </div>
      <p className="mt-3 text-base leading-relaxed text-gray-500">
        自己紹介を追加して、あなたのことを教えてください。
      </p>
    </section>
  );
}

function ProfileHeaderCard({ name }: { name: string }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]">
      <div className="relative h-36 bg-gradient-to-br from-emerald-800 via-emerald-700 to-emerald-600">
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
        <div className="absolute -top-16 left-6">
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

        <div className="flex justify-end pt-4">
          <button
            type="button"
            aria-label="プロフィールを編集"
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-700 bg-white text-emerald-700 transition hover:bg-emerald-50"
          >
            <PencilIcon className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {name}
            </h1>
            <p className="mt-2 text-base text-gray-400">ヘッドラインを追加</p>
          </div>
          <div className="flex items-center gap-5 pb-2 text-sm text-gray-500">
            <span className="inline-flex items-baseline gap-1.5">
              <span className="text-base font-bold text-gray-900">0</span>
              フォロワー
            </span>
            <span className="inline-flex items-baseline gap-1.5">
              <span className="text-base font-bold text-gray-900">0</span>
              フォロー中
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function AiReportCard() {
  const steps = [
    { label: "職歴を入力", done: false },
    { label: "スキルを入力", done: false },
    { label: "学歴を入力", done: false },
  ];
  const allDone = steps.every((s) => s.done);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-[#fae9b2] px-8 pt-11 pb-6 shadow-[0_1px_2px_rgba(120,80,20,0.05),0_10px_24px_-14px_rgba(160,110,20,0.3)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[url('/ai-report-wave.png')] bg-[length:100%_100%] bg-no-repeat opacity-45"
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,243,200,0.2)_0%,rgba(255,243,200,0)_50%,rgba(255,243,200,0.2)_100%)]" />

      <span className="absolute right-4 top-4 inline-flex items-center rounded-full border border-amber-300/60 bg-white/80 px-3.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-amber-800 shadow-sm backdrop-blur">
        AI Report
      </span>

      <div className="relative mx-auto max-w-md text-center">
        <h2 className="text-xl font-bold leading-snug tracking-tight text-gray-900">
          自分の強みと価値観を、<wbr />プロの視点で整理します
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-base leading-relaxed text-gray-800">
          診断結果と経歴をAIが分析し、あなた自身も気づいていない特性を言語化します。
        </p>

        <ul className="mt-5 flex items-center justify-center gap-6 text-[15px] font-medium text-gray-500/70">
          {steps.map((step) => (
            <li key={step.label} className="flex items-center gap-1.5">
              <span
                className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border border-gray-400/40 bg-white/40 ${
                  step.done ? "border-emerald-600 bg-emerald-600 text-white" : ""
                }`}
              >
                {step.done ? <CheckIcon className="h-2.5 w-2.5" /> : null}
              </span>
              {step.label}
            </li>
          ))}
        </ul>

        <button
          type="button"
          disabled={!allDone}
          className={`mt-5 inline-flex w-full max-w-[260px] items-center justify-center rounded-full px-6 py-3 text-base font-semibold transition ${
            allDone
              ? "bg-gradient-to-r from-amber-700 via-amber-600 to-amber-500 text-white shadow-[0_4px_14px_-4px_rgba(180,120,40,0.55)] hover:shadow-[0_6px_18px_-4px_rgba(180,120,40,0.65)]"
              : "bg-white/40 text-gray-500/70"
          }`}
        >
          レポートを生成する
        </button>
      </div>
    </section>
  );
}

function ResumeUploadCard() {
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
      <h2 className="relative mt-4 text-xl font-bold leading-snug tracking-tight text-gray-900">
        職務経歴書をアップロードするだけで、
        <br />
        プロフィールが完成します
      </h2>
      <p className="relative mx-auto mt-3 max-w-lg text-base leading-relaxed text-gray-500">
        PDF形式の職務経歴書をお持ちなら、アップロードするだけ。
        <br />
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

/* ---------- icons (inline SVG) ---------- */

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2.5H7a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z" />
      <path d="M14.5 2.5V7.5H19.5" />
      <path d="M9 12.5h6" />
      <path d="M9 15.5h6" />
      <path d="M9 9.5h2.5" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
      <path d="M19 14l.9 2.6L22.5 17.5l-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9z" opacity="0.6" />
    </svg>
  );
}

function AwardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="9" r="5.5" />
      <path d="M8 13.5 6.5 21l5.5-3 5.5 3L16 13.5" />
    </svg>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

function CapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" />
    </svg>
  );
}

function FaceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      {/* Left eye */}
      <circle cx="16" cy="23" r="5.8" fill="currentColor" />
      <circle cx="18" cy="21" r="1.8" fill="white" />
      {/* Right eye */}
      <circle cx="48" cy="23" r="5.8" fill="currentColor" />
      <circle cx="50" cy="21" r="1.8" fill="white" />

      {/* Mouth: D-shape (flat top, rounded bottom) */}
      <path
        d="M19 42 A 13 13 0 0 0 45 42 Z"
        fill="currentColor"
      />

      {/* Hover: tongue slides down out of the mouth */}
      <g
        className="origin-[32px_43px] translate-y-0 scale-y-0 transition-transform duration-300 ease-out group-hover:translate-y-[4px] group-hover:scale-y-100"
      >
        <path
          d="M26 43 Q 26 55 32 55 Q 38 55 38 43 Z"
          fill="#ff8a9a"
        />
      </g>
    </svg>
  );
}
