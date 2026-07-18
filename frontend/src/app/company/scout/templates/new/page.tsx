"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FieldError, fieldAriaProps } from "@/components/form/FieldError";
import { useFieldErrors } from "@/components/form/useFieldErrors";
import {
  getScoutTemplatesListScoutTemplatesQueryKey,
  useScoutTemplatesCreateScoutTemplate,
} from "@/external/client/api/orval/generated/endpoints/scout-templates/scout-templates";
import { ScoutTemplatesCreateScoutTemplateBody } from "@/external/client/api/orval/generated/zod/scout-templates/scout-templates.zod";
import {
  HighlightInput,
  HighlightTextarea,
} from "@/features/scout/components/VariableHighlightField";
import { getErrorMessage } from "@/lib/api-result";
import type { FieldErrors } from "@/lib/form-validation";

export default function TemplateNewPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { fieldErrors, validate, setErrors, clearField, scrollToFirstError } = useFieldErrors();

  const createMutation = useScoutTemplatesCreateScoutTemplate();
  const saving = createMutation.isPending;

  const handleSave = async () => {
    // スキーマに min(1) が無いため必須チェックはドメインルールとして行う
    const missing: FieldErrors = {};
    if (!name.trim()) missing.name = "入力してください";
    if (!subject.trim()) missing.subject = "入力してください";
    if (!body.trim()) missing.body = "入力してください";
    if (Object.keys(missing).length > 0) {
      setErrors(missing);
      scrollToFirstError();
      return;
    }
    const payload = { name: name.trim(), subject: subject.trim(), body: body.trim() };
    if (!validate(ScoutTemplatesCreateScoutTemplateBody, payload)) {
      scrollToFirstError();
      return;
    }
    setError(null);
    try {
      await createMutation.mutateAsync({ data: payload });
      await queryClient.invalidateQueries({
        queryKey: getScoutTemplatesListScoutTemplatesQueryKey(),
      });
      router.push("/company/scout/templates");
    } catch (e) {
      setError(getErrorMessage(e, "保存に失敗しました"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/company/scout/templates"
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
        テンプレート一覧
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">テンプレート作成</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="whitespace-pre-line text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            テンプレート名 <span className="text-red-500">*</span>
          </label>
          <input
            {...fieldAriaProps("name", fieldErrors.name)}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearField("name");
            }}
            placeholder="例: 初回スカウト用"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none aria-invalid:border-red-400 aria-invalid:bg-red-50/60"
          />
          <FieldError name="name" error={fieldErrors.name} />
        </div>

        {/* Subject */}
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
            件名 <span className="text-red-500">*</span>
          </label>
          <HighlightInput
            id="subject"
            error={fieldErrors.subject}
            value={subject}
            onChange={(v) => {
              setSubject(v);
              clearField("subject");
            }}
            placeholder="例: {{candidate_name}}様へ {{company_name}} からのスカウト"
          />
        </div>

        {/* Body */}
        <div>
          <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
            本文 <span className="text-red-500">*</span>
          </label>
          <HighlightTextarea
            id="body"
            error={fieldErrors.body}
            value={body}
            onChange={(v) => {
              setBody(v);
              clearField("body");
            }}
            placeholder="スカウトメッセージのテンプレート本文..."
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
            onClick={handleSave}
            disabled={saving}
            className="bg-[#2979ff] text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? "保存中..." : "保存する"}
          </button>
          <Link
            href="/company/scout/templates"
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            キャンセル
          </Link>
        </div>
      </div>
    </div>
  );
}
