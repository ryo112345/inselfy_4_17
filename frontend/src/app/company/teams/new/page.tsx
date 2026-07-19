"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FieldError, fieldAriaProps } from "@/components/form/FieldError";
import { useFieldErrors } from "@/components/form/useFieldErrors";
import { companyTeamsCreateTeam } from "@/external/client/api/orval/generated/endpoints/company-teams/company-teams";
import { CompanyTeamsCreateTeamBody } from "@/external/client/api/orval/generated/zod/company-teams/company-teams.zod";
import { getErrorMessage } from "@/lib/api-result";

export default function NewTeamPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { fieldErrors, validate, clearField, scrollToFirstError } = useFieldErrors();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const body = { name: name.trim(), description: description.trim() || null };
    if (!validate(CompanyTeamsCreateTeamBody, body)) {
      scrollToFirstError();
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const team = await companyTeamsCreateTeam(body);
      router.push(`/company/teams/${team.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "作成に失敗しました"));
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/company/teams"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <svg
          aria-hidden="true"
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        チーム一覧に戻る
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">新しいチームを作成</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
            チーム名 <span className="text-red-500">*</span>
          </label>
          <input
            {...fieldAriaProps("name", fieldErrors.name)}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearField("name");
            }}
            maxLength={100}
            placeholder="例: 開発チーム"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#2979ff] focus:ring-1 focus:ring-[#2979ff] outline-none transition-colors aria-invalid:border-red-400 aria-invalid:bg-red-50/60"
          />
          <FieldError name="name" error={fieldErrors.name} />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1.5">
            説明（任意）
          </label>
          <textarea
            {...fieldAriaProps("description", fieldErrors.description)}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clearField("description");
            }}
            maxLength={500}
            rows={3}
            placeholder="チームの説明を入力してください"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#2979ff] focus:ring-1 focus:ring-[#2979ff] outline-none transition-colors resize-none aria-invalid:border-red-400 aria-invalid:bg-red-50/60"
          />
          <FieldError name="description" error={fieldErrors.description} />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="w-full rounded-lg px-5 py-3 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          style={{ backgroundColor: "#2979ff" }}
        >
          {submitting ? "作成中..." : "チームを作成"}
        </button>
      </form>
    </div>
  );
}
