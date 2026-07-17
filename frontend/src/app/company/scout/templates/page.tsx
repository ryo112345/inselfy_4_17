"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { useConfirm, useToast } from "@/components/ui";
import {
  getScoutTemplatesListScoutTemplatesQueryKey,
  useScoutTemplatesDeleteScoutTemplate,
  useScoutTemplatesListScoutTemplates,
} from "@/external/client/api/orval/generated/endpoints/scout-templates/scout-templates";
import type { ModelsScoutTemplateListResponse } from "@/external/client/api/orval/generated/models";
import { getErrorMessage } from "@/lib/api-result";
import { formatDate } from "@/lib/date";

export default function TemplateListPage() {
  const [deleting, setDeleting] = useState<string | null>(null);
  const confirmDialog = useConfirm();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const listKey = getScoutTemplatesListScoutTemplatesQueryKey();
  const listQuery = useScoutTemplatesListScoutTemplates();
  const templates = listQuery.data?.items ?? [];
  const loading = listQuery.isPending;
  const error = listQuery.error?.message ?? null;

  const deleteMutation = useScoutTemplatesDeleteScoutTemplate();

  const handleDelete = async (id: string) => {
    if (
      !(await confirmDialog({
        title: "テンプレートの削除",
        message: "このテンプレートを削除しますか？",
        confirmLabel: "削除する",
        destructive: true,
      }))
    )
      return;
    setDeleting(id);
    try {
      await deleteMutation.mutateAsync({ templateId: id });
      // 削除行を一覧キャッシュから即時除去する（従来のローカル filter と同じ挙動）
      queryClient.setQueryData(listKey, (prev: ModelsScoutTemplateListResponse | undefined) =>
        prev ? { ...prev, items: prev.items.filter((t) => t.id !== id) } : prev,
      );
    } catch (e) {
      showToast(getErrorMessage(e, "削除に失敗しました"), "error");
    } finally {
      setDeleting(null);
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
        <h1 className="text-2xl font-bold text-gray-900">テンプレート管理</h1>
        <Link
          href="/company/scout/templates/new"
          className="bg-[#2979ff] text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          新規作成
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
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 text-sm">テンプレートはまだありません</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900">{tmpl.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">件名: {tmpl.subject}</p>
                  <p className="text-sm text-gray-400 mt-2 line-clamp-2">{tmpl.body}</p>
                  <p className="text-xs text-gray-400 mt-3">
                    作成日: {formatDate(tmpl.createdAt)} / 更新日: {formatDate(tmpl.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 shrink-0">
                  <Link
                    href={`/company/scout/templates/${tmpl.id}`}
                    className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                  >
                    編集
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(tmpl.id)}
                    disabled={deleting === tmpl.id}
                    className="border border-red-200 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {deleting === tmpl.id ? "削除中..." : "削除"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
