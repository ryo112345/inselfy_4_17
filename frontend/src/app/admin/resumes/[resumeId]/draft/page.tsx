"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useConfirm, useToast } from "@/components/ui";
import { adminFetch } from "@/features/admin/api";
import { formatDate } from "@/lib/date";
import { type AdminResume, downloadResumePdf, resumeStatusBadge } from "../../shared";

// CLAUDE.md の職務経歴書ワークフローのドラフト JSON 形（表示用に緩く型付け）
interface DraftExperience {
  company_name?: string;
  title?: string;
  start_year?: number;
  start_month?: number;
  end_year?: number | null;
  end_month?: number | null;
  start_date?: string;
  end_date?: string;
  is_current?: boolean;
  description?: string;
}

interface Draft {
  headline?: string;
  about?: string;
  location?: string;
  industry?: string;
  url?: string;
  experiences?: DraftExperience[];
  educations?: { school?: string; degree?: string; start_year?: number; end_year?: number }[];
  skill_names?: string[];
}

function period(e: DraftExperience): string {
  const start =
    e.start_date ?? (e.start_year != null ? `${e.start_year}-${e.start_month ?? "?"}` : "?");
  if (e.is_current) return `${start} 〜 現在`;
  const end = e.end_date ?? (e.end_year != null ? `${e.end_year}-${e.end_month ?? "?"}` : "?");
  return `${start} 〜 ${end}`;
}

export default function AdminResumeDraftPage() {
  const { resumeId } = useParams<{ resumeId: string }>();
  const confirmDialog = useConfirm();
  const { showToast } = useToast();

  const [upload, setUpload] = useState<AdminResume | null>(null);
  const [draftText, setDraftText] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDraft = useCallback(async () => {
    setLoading(true);
    const res = await adminFetch(`/api/admin/resumes/${resumeId}/draft`);
    if (res.ok) {
      const body: { upload: AdminResume; draft: Draft | null } = await res.json();
      setUpload(body.upload);
      setDraftText(body.draft ? JSON.stringify(body.draft, null, 2) : "");
    } else {
      setNotFound(true);
    }
    setLoading(false);
  }, [resumeId]);

  useEffect(() => {
    fetchDraft();
  }, [fetchDraft]);

  const parsedDraft: Draft | null = (() => {
    if (!draftText.trim()) return null;
    try {
      return JSON.parse(draftText) as Draft;
    } catch {
      return null;
    }
  })();

  const editable = upload?.status === "pending" || upload?.status === "reviewing";

  const handleSave = async () => {
    setError(null);
    if (!draftText.trim()) {
      setError("ドラフト JSON を入力してください");
      return;
    }
    try {
      JSON.parse(draftText);
    } catch {
      setError("JSON の構文が不正です");
      return;
    }
    setSaving(true);
    const res = await adminFetch(`/api/admin/resumes/${resumeId}/draft`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: draftText,
    });
    if (res.ok) {
      showToast("ドラフトを保存しました（確認中に変更）", "success");
      await fetchDraft();
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "保存に失敗しました");
    }
    setSaving(false);
  };

  const handleApprove = async () => {
    const ok = await confirmDialog({
      title: "承認してプロフィールに反映しますか？",
      message: "職歴・学歴は全て置き換えられ、スキルが追加されます。この操作は取り消せません。",
      confirmLabel: "承認して反映",
    });
    if (!ok) return;
    setActing(true);
    setError(null);
    const res = await adminFetch(`/api/admin/resumes/${resumeId}/approve`, { method: "POST" });
    if (res.ok) {
      showToast("プロフィールに反映しました", "success");
      await fetchDraft();
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "承認に失敗しました");
    }
    setActing(false);
  };

  const handleReject = async () => {
    const ok = await confirmDialog({
      title: "このアップロードを却下しますか？",
      message: "候補者は再アップロードできるようになります。",
      confirmLabel: "却下する",
      destructive: true,
    });
    if (!ok) return;
    setActing(true);
    setError(null);
    const res = await adminFetch(`/api/admin/resumes/${resumeId}/reject`, { method: "POST" });
    if (res.ok) {
      showToast("却下しました", "success");
      await fetchDraft();
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.message ?? "却下に失敗しました");
    }
    setActing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex justify-center pt-24">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !upload) {
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="max-w-[900px] mx-auto px-6 py-12 text-center text-[var(--muted)]">
          職務経歴書が見つかりません
          <div className="mt-4">
            <Link href="/admin/resumes" className="text-sm underline">
              一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-[900px] mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/admin/resumes"
            className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <svg
              aria-hidden="true"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <h1 className="text-2xl font-bold">ドラフト確認</h1>
          {resumeStatusBadge(upload.status)}
        </div>

        <div className="flex items-center gap-3 mb-8 text-sm text-[var(--muted)]">
          <span>
            {upload.userName}（@{upload.username}）
          </span>
          <span>・</span>
          <button
            type="button"
            onClick={() => downloadResumePdf(upload.id, upload.originalFilename)}
            className="text-blue-600 hover:underline cursor-pointer"
          >
            {upload.originalFilename}
          </button>
          <span>・</span>
          <span>{formatDate(upload.createdAt)}</span>
        </div>

        {/* 構造化プレビュー */}
        {parsedDraft ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 space-y-5">
            {(parsedDraft.headline || parsedDraft.about) && (
              <div>
                {parsedDraft.headline && (
                  <div className="text-base font-bold">{parsedDraft.headline}</div>
                )}
                {parsedDraft.about && (
                  <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                    {parsedDraft.about}
                  </p>
                )}
              </div>
            )}
            {(parsedDraft.experiences?.length ?? 0) > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-[var(--muted)] mb-2">
                  職歴（{parsedDraft.experiences?.length}件・全置き換え）
                </h2>
                <div className="space-y-3">
                  {parsedDraft.experiences?.map((e, idx) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: 表示専用の静的リスト
                      key={idx}
                      className="border-l-2 border-gray-200 pl-3"
                    >
                      <div className="text-sm font-medium">
                        {e.company_name} — {e.title}
                      </div>
                      <div className="text-xs text-[var(--muted)]">{period(e)}</div>
                      {e.description && (
                        <p className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">
                          {e.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(parsedDraft.educations?.length ?? 0) > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-[var(--muted)] mb-2">学歴</h2>
                {parsedDraft.educations?.map((ed, idx) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: 表示専用の静的リスト
                    key={idx}
                    className="text-sm"
                  >
                    {ed.school}
                    {ed.degree ? `（${ed.degree}）` : ""}
                    {ed.start_year != null && (
                      <span className="text-xs text-[var(--muted)] ml-2">
                        {ed.start_year}〜{ed.end_year ?? ""}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {(parsedDraft.skill_names?.length ?? 0) > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-[var(--muted)] mb-2">スキル（追加）</h2>
                <div className="flex flex-wrap gap-1.5">
                  {parsedDraft.skill_names?.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 mb-6 text-sm text-[var(--muted)]">
            ドラフト未保存です。PDF を確認して下のエディタに JSON
            を入力するか、Claude（管理ワークフロー）で処理してください。
          </div>
        )}

        {/* JSON エディタ */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-[var(--muted)] mb-2">ドラフト JSON</h2>
          <textarea
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            disabled={!editable}
            rows={16}
            spellCheck={false}
            className="w-full rounded-lg border border-gray-200 p-3 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:bg-gray-50 disabled:text-gray-400"
            placeholder='{"headline": "...", "experiences": [...], "educations": [...], "skill_names": [...]}'
          />
          {error && (
            <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {editable && (
            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || acting}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? "保存中..." : "下書き保存"}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={acting || saving}
                  className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  却下
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={acting || saving || upload.status !== "reviewing"}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {acting ? "処理中..." : "承認してプロフィールに反映"}
                </button>
              </div>
            </div>
          )}
          {upload.status === "pending" && (
            <p className="mt-2 text-xs text-[var(--muted)]">
              ※ 承認はドラフトを保存して「確認中」にしてから行えます
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
