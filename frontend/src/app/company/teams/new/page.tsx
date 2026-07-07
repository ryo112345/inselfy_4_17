"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCompanyAuth } from "@/features/company-auth/company-auth-context";

export default function NewTeamPage() {
  const router = useRouter();
  const { companyFetch } = useCompanyAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await companyFetch("/api/company/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "作成に失敗しました");
      }
      const team = await res.json();
      router.push(`/company/teams/${team.id}`);
    } catch (err: any) {
      setError(err.message);
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            チーム名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="例: 開発チーム"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#2979ff] focus:ring-1 focus:ring-[#2979ff] outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">説明（任意）</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="チームの説明を入力してください"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-[#2979ff] focus:ring-1 focus:ring-[#2979ff] outline-none transition-colors resize-none"
          />
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
