"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckIcon } from "./Icons";
import { IntegratedReportModal } from "./IntegratedReportModal";

type Props = {
  hasExperience: boolean;
  hasSkills: boolean;
  hasEducation: boolean;
  intReportRequestId?: string | null;
};

export function AiReportCard({ hasExperience, hasSkills, hasEducation, intReportRequestId }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [requestStatus, setRequestStatus] = useState<"none" | "pending" | "ready">(
    intReportRequestId ? "pending" : "none",
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/integrated-report/status", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.status) setRequestStatus(data.status);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const steps = [
    { label: "職歴を入力", done: hasExperience },
    { label: "スキルを入力", done: hasSkills },
    { label: "学歴を入力", done: hasEducation },
  ];
  const allDone = steps.every((s) => s.done);

  const handleSubmitted = useCallback(() => {
    setRequestStatus("pending");
  }, []);

  if (requestStatus === "ready") {
    return null;
  }

  const buttonLabel =
    requestStatus === "pending"
      ? "リクエスト済み（生成中）"
      : "レポートを生成する";

  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-[#fae9b2] px-4 md:px-8 pt-11 pb-6 shadow-[0_1px_2px_rgba(120,80,20,0.05),0_10px_24px_-14px_rgba(160,110,20,0.3)]">
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

          <ul className="mt-5 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 text-[15px] font-medium text-gray-500/70">
            {steps.map((step) => (
              <li key={step.label} className="flex items-center gap-1.5">
                <span
                  className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border ${
                    step.done
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-gray-400/40 bg-white/40"
                  }`}
                >
                  {step.done ? <CheckIcon className="h-2.5 w-2.5" /> : null}
                </span>
                <span className={step.done ? "text-gray-800" : ""}>{step.label}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            disabled={!allDone || requestStatus === "pending"}
            onClick={() => { if (allDone) setModalOpen(true); }}
            className={`mt-5 inline-flex w-full max-w-[260px] items-center justify-center rounded-full px-6 py-3 text-base font-semibold transition ${
              allDone && requestStatus !== "pending"
                ? "bg-gradient-to-r from-amber-700 via-amber-600 to-amber-500 text-white shadow-[0_4px_14px_-4px_rgba(180,120,40,0.55)] hover:shadow-[0_6px_18px_-4px_rgba(180,120,40,0.65)]"
                : "bg-white/40 text-gray-500/70"
            }`}
          >
            {buttonLabel}
          </button>
        </div>
      </section>

      <IntegratedReportModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmitted={handleSubmitted}
      />
    </>
  );
}
