"use client";

import Link from "next/link";
import { useState } from "react";
import { InlineTextarea } from "@/features/job-posting/components/inline-inputs";
import { cardClass, JobPostingForm } from "@/features/job-posting/components/JobPostingForm";
import type { CompanyProfile } from "@/features/job-posting/useCompanyProfile";
import { useJobForm } from "@/features/job-posting/useJobForm";

const MOCK_DATA = {
  title: "バックエンドエンジニア｜Go / PostgreSQL / AWS でプロダクト基盤を設計",
  status: "open" as const,
  jobCategory: "エンジニア",
  employmentType: "正社員",
  hiringCount: "1〜2名",
  description:
    "inselfyの価値観マッチングエンジンを支えるAPI基盤の設計・開発をリードしていただきます。Bradley-Terryモデルによるスコアリング、pgvectorを活用したベクトル検索、リアルタイム推薦アルゴリズムなど、データと密接に結びついたバックエンド開発が中心です。",
  appealPoints:
    "独自の価値観診断アルゴリズムとマッチングエンジンの開発に携われます。少人数チームのため、技術選定からアーキテクチャ設計まで裁量を持って取り組める環境です。フルリモート・フルフレックスで、自律的に働ける文化を大切にしています。",
  challenges:
    "急成長フェーズのプロダクトで、スケーラビリティとパフォーマンスの両立が求められます。統計モデルの実装やベクトル検索の最適化など、一般的なCRUD開発とは異なる技術的チャレンジがあります。",
  teamDescription:
    "現在エンジニア5名のチームで、全員がフルスタック志向を持ちながらもバックエンドに強みを持つメンバーが揃っています。コードレビューを重視し、技術的な議論を日常的に行うカルチャーです。",
  skillsGained:
    "Go言語での大規模API設計スキル、統計モデルの実装経験、ベクトルデータベースの運用知識、AWSインフラの設計・構築スキルが身につきます。",
  tags: ["Go", "PostgreSQL", "AWS", "pgvector", "API設計", "マッチングアルゴリズム"],
  requiredQualifications:
    "Go言語でのWebアプリケーション開発経験3年以上。RDBMSを用いたバックエンド開発の実務経験。",
  preferredQualifications:
    "PostgreSQLの運用・チューニング経験。AWSでのインフラ構築経験。統計学やデータサイエンスへの興味。OSS活動やテックブログでの発信経験。",
  workLocation: "東京都渋谷区（フルリモート勤務可）",
  workLocationChangeScope: "当面なし",
  jobDescriptionChangeScope: "当面なし",
  contractType: "無期",
  probationPeriod: "入社後3ヶ月（条件変更なし）",
  workHours: "フレックスタイム制（コアタイムなし）標準労働時間8時間",
  breakTime: "60分",
  holidays:
    "完全週休2日制（土日祝）、年末年始休暇、有給休暇（入社半年後10日付与）、慶弔休暇、産前産後休暇、育児休暇",
  salaryMin: 600,
  salaryMax: 1000,
  salaryDetail: "月給50万円〜83万円（固定残業代45時間分を含む）。経験・能力を考慮の上決定。",
  insurance: "健康保険、厚生年金、雇用保険、労災保険",
  smokingPolicy: "屋内原則禁煙（喫煙専用室あり）",
  benefits: [
    "リモートワーク手当月3万円",
    "書籍購入費全額補助",
    "カンファレンス参加費補助",
    "副業OK",
  ],
  remotePolicy: "フルリモート",
  selectionProcess: "書類選考 → 技術面接（コーディングテスト含む） → 最終面接 → 内定",
};

const MOCK_COMPANY: CompanyProfile = {
  id: "mock",
  companyName: "inselfy株式会社",
  industry: "HRテック",
  location: "東京都渋谷区",
  employeeCount: "10〜30名",
  logoUrl: "",
  benefits: [],
  smokingPolicy: "",
  galleryUrls: [],
};

// プロトタイプなので実アップロードせず ObjectURL でその場表示する
const mockUpload = async (file: File) => URL.createObjectURL(file);

export default function TestJobEditPage() {
  const { status: _initialStatus, ...initialValues } = MOCK_DATA;
  const { values, set } = useJobForm(initialValues);
  const [status, setStatus] = useState<"open" | "draft">(MOCK_DATA.status);

  const statusLabel = status === "open" ? "公開中" : "下書き";
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
              href="/test/jobs"
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
              プロトタイプ — 編集中（データは保存されません）
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setStatus(status === "open" ? "draft" : "open")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors ${statusColor}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${status === "open" ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              {statusLabel}
            </button>
            <button
              type="button"
              className="bg-[#2979ff] text-white px-5 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors cursor-pointer"
            >
              保存する
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 pb-24 pt-8">
        <JobPostingForm
          values={values}
          set={set}
          company={MOCK_COMPANY}
          uploaders={{ uploadCover: mockUpload, uploadGallery: mockUpload }}
          teamSection={
            <section className={`overflow-hidden ${cardClass}`}>
              <div className="px-6 py-6 sm:px-7 sm:py-7">
                <h2 className="text-lg font-bold text-gray-900">チーム紹介</h2>
                <InlineTextarea
                  value={values.teamDescription}
                  onChange={(v) => set("teamDescription", v)}
                  placeholder="チームの雰囲気やメンバー構成を記入..."
                  rows={4}
                  className="mt-3 text-base leading-relaxed text-gray-700"
                />
              </div>
            </section>
          }
        />
      </div>
    </div>
  );
}
