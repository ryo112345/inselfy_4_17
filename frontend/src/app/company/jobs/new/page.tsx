"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ErrorSummary } from "@/components/form/ErrorSummary";
import { useFieldErrors } from "@/components/form/useFieldErrors";
import { createJobPosting } from "@/features/job-posting/api";
import { JobPostingForm } from "@/features/job-posting/components/JobPostingForm";
import { SimpleTeamSection } from "@/features/job-posting/components/TeamSection";
import { useCompanyProfile } from "@/features/job-posting/useCompanyProfile";
import {
  buildJobPostingBody,
  buildPreviewPayload,
  jobPostingBodySchema,
  jobPostingFieldLabels,
  makeSetWithClear,
  useJobForm,
} from "@/features/job-posting/useJobForm";
import { useJobPreviewChannel } from "@/features/job-posting/useJobPreviewChannel";

export default function JobNewPage() {
  const router = useRouter();
  const company = useCompanyProfile();
  const { values, set, requiredOk } = useJobForm();
  const { fieldErrors, validate, clearField, scrollToFirstError } = useFieldErrors();
  const setField = useMemo(() => makeSetWithClear(set, clearField), [set, clearField]);

  const [status, setStatus] = useState<"open" | "draft">("draft");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 企業プロフィールの福利厚生をフォームへ自動反映
  useEffect(() => {
    if (company && company.benefits.length > 0) {
      set("benefits", company.benefits);
    }
  }, [company, set]);

  const previewPayload = useMemo(() => buildPreviewPayload(values), [values]);
  useJobPreviewChannel(previewPayload);

  const handleSubmit = async (publishStatus: "open" | "draft") => {
    if (publishStatus === "open" && !requiredOk) return;
    if (publishStatus === "draft" && !values.title.trim()) {
      setSubmitError("下書き保存にもタイトルが必要です");
      return;
    }

    const body = {
      ...buildJobPostingBody(values, publishStatus, null),
      title: values.title.trim(),
      description: values.description.trim(),
      location: values.workLocation.trim() || null,
    };
    if (!validate(jobPostingBodySchema, body)) {
      scrollToFirstError();
      return;
    }

    setSaving(true);
    setSubmitError(null);
    try {
      await createJobPosting(body);
      setStatus(publishStatus);
      router.push("/company/jobs");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "保存に失敗しました";
      setSubmitError(msg);
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = status === "open" ? "公開予定" : "下書き";
  const statusColor =
    status === "open"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="min-h-screen bg-[#f6f7f5]">
      {/* Edit toolbar */}
      <div className="sticky top-0 z-30 border-b border-blue-200 bg-blue-50 px-6 py-2.5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/company/jobs"
              className="text-sm text-[#2979ff] hover:underline inline-flex items-center gap-1"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              求人一覧
            </Link>
            <span className="text-sm text-blue-800 font-medium">
              新規作成 — 見た目そのままで編集できます
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.open("/company/jobs/preview", "_blank")}
              className="inline-flex items-center gap-1.5 border border-gray-300 bg-white text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors cursor-pointer"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              プレビュー
            </button>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusColor}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${status === "open" ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              {statusLabel}
            </span>
            <button
              type="button"
              onClick={() => handleSubmit("draft")}
              disabled={saving}
              className="border border-gray-300 bg-white text-gray-700 px-4 py-1.5 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              下書き保存
            </button>
            <button
              type="button"
              onClick={() => handleSubmit("open")}
              disabled={saving || !requiredOk}
              className="bg-[#2979ff] text-white px-5 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title={!requiredOk ? "必須項目を全て入力してください" : ""}
            >
              {saving ? "保存中..." : "公開する"}
            </button>
          </div>
        </div>
      </div>

      {submitError && (
        <div className="mx-auto max-w-4xl px-4 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="whitespace-pre-line text-sm text-red-700">{submitError}</p>
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 pb-24 pt-8">
        <ErrorSummary errors={fieldErrors} labels={jobPostingFieldLabels} />
        <JobPostingForm
          values={values}
          set={setField}
          company={company}
          errors={fieldErrors}
          titlePlaceholder="求人タイトルを入力（例：バックエンドエンジニア｜Go / PostgreSQL / AWS）"
          teamSection={<SimpleTeamSection values={values} set={setField} />}
        />

        {/* Bottom save bar */}
        <div className="pt-4 flex items-center justify-end gap-3">
          <Link
            href="/company/jobs"
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            キャンセル
          </Link>
          <button
            type="button"
            onClick={() => handleSubmit("draft")}
            disabled={saving}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            下書き保存
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("open")}
            disabled={saving || !requiredOk}
            className="bg-[#2979ff] text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "保存中..." : "公開する"}
          </button>
        </div>
      </div>
    </div>
  );
}
