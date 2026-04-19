"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface PendingSession {
  session_id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  completed_at: string | null;
}

export default function AdminReportsPage() {
  const [sessions, setSessions] = useState<PendingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [promptContent, setPromptContent] = useState<Record<string, string>>({});
  const [loadingPrompt, setLoadingPrompt] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reports/pending");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const togglePrompt = async (session: PendingSession) => {
    const sid = session.session_id;

    if (expandedPrompt === sid) {
      setExpandedPrompt(null);
      return;
    }

    if (promptContent[sid]) {
      setExpandedPrompt(sid);
      return;
    }

    setLoadingPrompt(sid);
    try {
      const res = await fetch(`/api/admin/sessions/${sid}/prompt`);
      if (!res.ok) throw new Error("プロンプトの取得に失敗しました");
      const data = await res.json();
      setPromptContent((prev) => ({ ...prev, [sid]: data.prompt }));
      setExpandedPrompt(sid);
    } catch {
      // silently fail
    } finally {
      setLoadingPrompt(null);
    }
  };

  const copyPrompt = async (sid: string) => {
    const text = promptContent[sid];
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-[900px] mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-[var(--foreground)]">AIレポート管理</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">レポート未生成のセッションはありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">
              レポート未生成: {sessions.length}件
            </p>
            {sessions.map((s) => {
              const sid = s.session_id;
              const isExpanded = expandedPrompt === sid;
              const isLoadingThis = loadingPrompt === sid;

              return (
                <div
                  key={sid}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {s.display_name ?? s.username}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        @{s.username}
                        {s.completed_at && (
                          <span className="ml-2">
                            {new Date(s.completed_at).toLocaleDateString("ja-JP")} 完了
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => togglePrompt(s)}
                      disabled={isLoadingThis}
                      className="shrink-0 ml-4 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {isLoadingThis ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          読み込み中
                        </span>
                      ) : isExpanded ? (
                        "プロンプトを閉じる"
                      ) : (
                        "プロンプトを表示"
                      )}
                    </button>
                  </div>

                  {isExpanded && promptContent[sid] && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-gray-500">
                          Claude Code に渡すプロンプト
                        </p>
                        <button
                          onClick={() => copyPrompt(sid)}
                          className="text-xs text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer"
                        >
                          コピー
                        </button>
                      </div>
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-white border border-gray-200 rounded-md p-4 max-h-[400px] overflow-y-auto leading-relaxed">
                        {promptContent[sid]}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
