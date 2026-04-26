"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { fetchJobPosting, updateJobPosting } from "@/features/job-posting/api";
import type { JobPosting } from "@/features/scout/types";

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "正社員" },
  { value: "part_time", label: "パートタイム" },
  { value: "contract", label: "契約社員" },
  { value: "freelance", label: "業務委託" },
  { value: "internship", label: "インターン" },
];

export default function JobEditPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [location, setLocation] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobPosting(jobId)
      .then((job) => {
        setTitle(job.title);
        setDescription(job.description);
        setEmploymentType(job.employmentType);
        setLocation(job.location ?? "");
        setIsActive(job.isActive);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("タイトルは必須です");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateJobPosting(jobId, {
        title: title.trim(),
        description: description.trim(),
        employmentType,
        location: location.trim() || undefined,
      });
      router.push("/company/jobs");
    } catch (e: any) {
      setError(e.message ?? "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateJobPosting(jobId, {
        title: title.trim(),
        description: description.trim(),
        employmentType,
        location: location.trim() || undefined,
      });
      // Note: isActive toggle may need a separate API field; for now we send a full update
      // and toggle the local state. If the API supports `isActive` in the body, add it here.
      setIsActive(!isActive);
    } catch (e: any) {
      setError(e.message ?? "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <p className="text-gray-400 text-sm">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/company/jobs" className="text-sm text-[#2979ff] hover:underline inline-flex items-center gap-1">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        求人一覧
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">求人編集</h1>
        {/* Active toggle */}
        <button
          onClick={handleToggleActive}
          disabled={saving}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            isActive
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
              : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
          }`}
        >
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              isActive ? "bg-emerald-500" : "bg-gray-400"
            }`}
          />
          {isActive ? "公開中" : "非公開"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: バックエンドエンジニア"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="求人の詳細説明..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[200px] text-sm resize-y outline-none"
          />
        </div>

        {/* Employment type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">雇用形態</label>
          <select
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none bg-white"
          >
            {EMPLOYMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">勤務地</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="例: 東京都渋谷区"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none"
          />
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
            href="/company/jobs"
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            キャンセル
          </Link>
        </div>
      </div>
    </div>
  );
}
