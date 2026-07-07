"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createTemplate } from "@/features/scout/api";
import {
  HighlightInput,
  HighlightTextarea,
} from "@/features/scout/components/VariableHighlightField";

export default function TemplateNewPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim() || !subject.trim() || !body.trim()) {
      setError("全てのフィールドを入力してください");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createTemplate({
        name: name.trim(),
        subject: subject.trim(),
        body: body.trim(),
      });
      router.push("/company/scout/templates");
    } catch (e: any) {
      setError(e.message ?? "保存に失敗しました");
    } finally {
      setSaving(false);
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
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            テンプレート名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 初回スカウト用"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none"
          />
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            件名 <span className="text-red-500">*</span>
          </label>
          <HighlightInput
            value={subject}
            onChange={setSubject}
            placeholder="例: {{candidate_name}}様へ {{company_name}} からのスカウト"
          />
        </div>

        {/* Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            本文 <span className="text-red-500">*</span>
          </label>
          <HighlightTextarea
            value={body}
            onChange={setBody}
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
