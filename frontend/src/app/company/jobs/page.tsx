"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJobPostings } from "@/features/job-posting/api";
import type { JobPosting } from "@/features/scout/types";

const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  full_time: "正社員",
  part_time: "パートタイム",
  contract: "契約社員",
  freelance: "業務委託",
  internship: "インターン",
};

export default function JobListPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchJobPostings()
      .then(setJobs)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">求人一覧</h1>
        <Link
          href="/company/jobs/new"
          className="bg-[#2979ff] text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          求人を作成
        </Link>
      </div>

      {error ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">読み込み中...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">求人はまだありません</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/company/jobs/${job.id}`}
              className="bg-white rounded-xl border border-gray-200 p-6 block hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900">{job.title}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-sm text-gray-500">
                      {EMPLOYMENT_TYPE_LABEL[job.employmentType] ?? job.employmentType}
                    </span>
                    {job.location && <span className="text-sm text-gray-500">{job.location}</span>}
                  </div>
                  {job.description && (
                    <p className="text-sm text-gray-400 mt-2 line-clamp-2">{job.description}</p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shrink-0 ml-4 ${
                    job.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {job.isActive ? "公開中" : "非公開"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
