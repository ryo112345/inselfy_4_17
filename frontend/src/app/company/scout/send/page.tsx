"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  useCompanyScoutsGetScoutCredits,
  useCompanyScoutsSendScout,
} from "@/external/client/api/orval/generated/endpoints/company-scouts/company-scouts";
import {
  getScoutTemplatesListScoutTemplatesQueryKey,
  useScoutTemplatesListScoutTemplates,
} from "@/external/client/api/orval/generated/endpoints/scout-templates/scout-templates";
import { CompanyScoutsSendScoutBody } from "@/external/client/api/orval/generated/zod/company-scouts/company-scouts.zod";
import { fetchJobPostings } from "@/features/job-posting/api";
import { getErrorMessage } from "@/lib/api-result";
import { formatFieldErrors, validateForm } from "@/lib/form-validation";

const fieldLabels = { candidateId: "候補者ID", subject: "件名", body: "本文" };

export default function ScoutSendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [candidateId, setCandidateId] = useState(searchParams.get("candidateId") ?? "");
  const [jobPostingId, setJobPostingId] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 取得失敗はいずれも無視して空表示にする（従来の catch 握り潰しと同じ挙動）
  const credits = useCompanyScoutsGetScoutCredits().data ?? null;
  const templatesQuery = useScoutTemplatesListScoutTemplates({
    query: {
      queryKey: getScoutTemplatesListScoutTemplatesQueryKey(),
      select: (data) => data.items,
    },
  });
  const templates = templatesQuery.data ?? [];
  const jobsQuery = useQuery({
    queryKey: ["job-posting", "companyList"],
    queryFn: fetchJobPostings,
  });
  const jobs = jobsQuery.data ?? [];
  const loadingData = templatesQuery.isPending || jobsQuery.isPending;

  const sendMutation = useCompanyScoutsSendScout();
  const sending = sendMutation.isPending;

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setSubject(tmpl.subject);
      setBody(tmpl.body);
    }
  };

  const handleSend = async () => {
    if (!candidateId.trim() || !subject.trim() || !body.trim()) {
      setError("候補者ID、件名、本文は必須です");
      return;
    }
    const payload = {
      candidateId: candidateId.trim(),
      jobPostingId: jobPostingId || undefined,
      subject: subject.trim(),
      body: body.trim(),
    };
    const fieldErrors = validateForm(CompanyScoutsSendScoutBody, payload);
    if (fieldErrors) {
      setError(formatFieldErrors(fieldErrors, fieldLabels).join("\n"));
      return;
    }
    setError(null);
    try {
      await sendMutation.mutateAsync({ data: payload });
      router.push("/company/scout");
    } catch (e) {
      setError(getErrorMessage(e, "送信に失敗しました"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/company/scout"
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
        スカウト一覧
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">スカウトを送る</h1>
        {credits && (
          <div className="text-sm text-gray-500">
            クレジット残高: <span className="font-semibold text-gray-900">{credits.balance}</span> /{" "}
            {credits.maxStock}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="whitespace-pre-line text-sm text-red-700">{error}</p>
        </div>
      )}

      {preview ? (
        /* Preview mode */
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">プレビュー</h2>
          <div className="border-b border-gray-100 pb-3">
            <p className="text-xs text-gray-400 mb-1">候補者ID</p>
            <p className="text-sm text-gray-700">{candidateId}</p>
          </div>
          {jobPostingId && (
            <div className="border-b border-gray-100 pb-3">
              <p className="text-xs text-gray-400 mb-1">求人</p>
              <p className="text-sm text-gray-700">
                {jobs.find((j) => j.id === jobPostingId)?.title ?? jobPostingId}
              </p>
            </div>
          )}
          <div className="border-b border-gray-100 pb-3">
            <p className="text-xs text-gray-400 mb-1">件名</p>
            <p className="text-sm font-medium text-gray-900">{subject}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">本文</p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{body}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPreview(false)}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors cursor-pointer"
            >
              編集に戻る
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="bg-[#2979ff] text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {sending ? "送信中..." : "送信する"}
            </button>
          </div>
        </div>
      ) : (
        /* Edit mode */
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
          {/* Candidate ID */}
          <div>
            <label
              htmlFor="scout-candidate-id"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              候補者ID <span className="text-red-500">*</span>
            </label>
            <input
              id="scout-candidate-id"
              type="text"
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              placeholder="候補者のIDを入力"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none"
            />
          </div>

          {/* Job posting select */}
          <div>
            <label
              htmlFor="scout-job-posting"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              求人（任意）
            </label>
            {loadingData ? (
              <p className="text-sm text-gray-400">読み込み中...</p>
            ) : (
              <select
                id="scout-job-posting"
                value={jobPostingId}
                onChange={(e) => setJobPostingId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none bg-white"
              >
                <option value="">求人を選択しない</option>
                {jobs
                  .filter((j) => j.isActive)
                  .map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* Template select */}
          <div>
            <label
              htmlFor="scout-template"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              テンプレート（任意）
            </label>
            {loadingData ? (
              <p className="text-sm text-gray-400">読み込み中...</p>
            ) : (
              <select
                id="scout-template"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateSelect(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none bg-white"
              >
                <option value="">テンプレートを選択しない</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="scout-subject" className="block text-sm font-medium text-gray-700 mb-1">
              件名 <span className="text-red-500">*</span>
            </label>
            <input
              id="scout-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="スカウトの件名"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none"
            />
          </div>

          {/* Body */}
          <div>
            <label htmlFor="scout-body" className="block text-sm font-medium text-gray-700 mb-1">
              本文 <span className="text-red-500">*</span>
            </label>
            <textarea
              id="scout-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="スカウトメッセージの本文を入力..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[200px] text-sm resize-y outline-none"
            />
          </div>

          {/* Template variables help */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <p className="text-xs font-medium text-blue-700 mb-1">テンプレート変数</p>
            <p className="text-xs text-blue-600">
              以下の変数が送信時に自動置換されます:&nbsp;
              <code className="bg-blue-100 px-1 py-0.5 rounded">{"{{candidate_name}}"}</code>&nbsp;
              <code className="bg-blue-100 px-1 py-0.5 rounded">{"{{company_name}}"}</code>&nbsp;
              <code className="bg-blue-100 px-1 py-0.5 rounded">{"{{job_title}}"}</code>
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPreview(true)}
              disabled={!subject.trim() || !body.trim()}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              プレビュー
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!candidateId.trim() || !subject.trim() || !body.trim() || sending}
              className="bg-[#2979ff] text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {sending ? "送信中..." : "送信する"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
