"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

import { adminFetch } from "@/features/admin/api";

interface PendingSession {
  session_id: string;
  user_id: string;
  username: string;
  name: string;
  completed_at: string | null;
}

interface IntegratedRequest {
  request_id: string;
  user_id: string;
  username: string;
  name: string;
  topic1: number;
  topic2: number;
  topic3: number;
  free_text: string;
  created_at: string;
}

interface Report {
  id: string;
  session_id: string;
  user_id: string;
  username: string;
  name: string;
  created_at: string;
  viewed_at: string | null;
}

interface IntegratedReport {
  id: string;
  request_id: string;
  user_id: string;
  username: string;
  name: string;
  created_at: string;
  viewed_at: string | null;
}

const TOPIC_LABELS: Record<number, string> = {
  1: "キャリアを「物語」として読み解く",
  2: "あなたの取扱説明書",
  3: "あなたの「仕事の流儀」",
  4: "面接で使える「自分の言語化」",
  5: "転職・異動の「判断パターン」分析",
  6: "あなたの「仕事スイッチ」の入り方",
  7: "あなたを一番成長させる「修羅場」",
  8: "あなたの「リーダーシップの型」",
  9: "最高の相性のチームメイト像",
  10: "見落としている「伸びしろ」",
};

type TabType = "wv" | "ci" | "integrated";
type SectionType = "pending" | "generated";

export default function AdminReportsPage() {
  const [tab, setTab] = useState<TabType>("wv");
  const [section, setSection] = useState<SectionType>("pending");
  const [wvSessions, setWvSessions] = useState<PendingSession[]>([]);
  const [ciSessions, setCiSessions] = useState<PendingSession[]>([]);
  const [intRequests, setIntRequests] = useState<IntegratedRequest[]>([]);
  const [wvReports, setWvReports] = useState<Report[]>([]);
  const [ciReports, setCiReports] = useState<Report[]>([]);
  const [intReports, setIntReports] = useState<IntegratedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [promptContent, setPromptContent] = useState<Record<string, string>>({});
  const [loadingPrompt, setLoadingPrompt] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [wvRes, ciRes, wvReportsRes, ciReportsRes, intPendingRes, intReportsRes] = await Promise.all([
        adminFetch("/api/admin/reports/pending"),
        adminFetch("/api/admin/ci-reports/pending"),
        adminFetch("/api/admin/reports/list"),
        adminFetch("/api/admin/ci-reports/list"),
        adminFetch("/api/admin/integrated-reports/pending"),
        adminFetch("/api/admin/integrated-reports/list"),
      ]);
      if (wvRes.ok) {
        const data = await wvRes.json();
        setWvSessions(data.sessions ?? []);
      }
      if (ciRes.ok) {
        const data = await ciRes.json();
        setCiSessions(data.sessions ?? []);
      }
      if (wvReportsRes.ok) {
        const data = await wvReportsRes.json();
        setWvReports(data.reports ?? []);
      }
      if (ciReportsRes.ok) {
        const data = await ciReportsRes.json();
        setCiReports(data.reports ?? []);
      }
      if (intPendingRes.ok) {
        const data = await intPendingRes.json();
        setIntRequests(data.requests ?? []);
      }
      if (intReportsRes.ok) {
        const data = await intReportsRes.json();
        setIntReports(data.reports ?? []);
      }
    } catch {
      setWvSessions([]);
      setCiSessions([]);
      setIntRequests([]);
      setWvReports([]);
      setCiReports([]);
      setIntReports([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pendingSessions = tab === "wv" ? wvSessions : tab === "ci" ? ciSessions : [];
  const reports = tab === "wv" ? wvReports : tab === "ci" ? ciReports : [];

  const togglePrompt = async (id: string) => {
    if (expandedPrompt === id) {
      setExpandedPrompt(null);
      return;
    }

    if (promptContent[id]) {
      setExpandedPrompt(id);
      return;
    }

    setLoadingPrompt(id);
    try {
      const endpoint = tab === "wv"
        ? `/api/admin/sessions/${id}/prompt`
        : tab === "ci"
        ? `/api/admin/ci-sessions/${id}/prompt`
        : `/api/admin/integrated-requests/${id}/prompt`;
      const res = await adminFetch(endpoint);
      if (!res.ok) throw new Error("プロンプトの取得に失敗しました");
      const data = await res.json();
      setPromptContent((prev) => ({ ...prev, [id]: data.prompt }));
      setExpandedPrompt(id);
    } catch {
      // silently fail
    } finally {
      setLoadingPrompt(null);
    }
  };

  const copyPrompt = async (id: string) => {
    const text = promptContent[id];
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };

  const resetViewed = async (id: string) => {
    const endpoint = tab === "wv"
      ? `/api/admin/sessions/${id}/reset-viewed`
      : tab === "ci"
      ? `/api/admin/ci-sessions/${id}/reset-viewed`
      : `/api/admin/integrated-requests/${id}/reset-viewed`;
    const res = await adminFetch(endpoint, { method: "POST" });
    if (res.ok) {
      if (tab === "integrated") {
        setIntReports((prev) =>
          prev.map((r) => r.request_id === id ? { ...r, viewed_at: null } : r)
        );
      } else {
        const setter = tab === "wv" ? setWvReports : setCiReports;
        setter((prev) =>
          prev.map((r) => r.session_id === id ? { ...r, viewed_at: null } : r)
        );
      }
    }
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

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => { setTab("wv"); setSection("pending"); setExpandedPrompt(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              tab === "wv"
                ? "bg-emerald-700 text-white"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Work Values
            {wvSessions.length > 0 && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                tab === "wv" ? "bg-emerald-600" : "bg-gray-200 text-gray-600"
              }`}>
                {wvSessions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab("ci"); setSection("pending"); setExpandedPrompt(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              tab === "ci"
                ? "bg-emerald-700 text-white"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            Career Interest
            {ciSessions.length > 0 && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                tab === "ci" ? "bg-emerald-600" : "bg-gray-200 text-gray-600"
              }`}>
                {ciSessions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab("integrated"); setSection("pending"); setExpandedPrompt(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              tab === "integrated"
                ? "bg-emerald-700 text-white"
                : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            統合レポート
            {intRequests.length > 0 && (
              <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                tab === "integrated" ? "bg-emerald-600" : "bg-gray-200 text-gray-600"
              }`}>
                {intRequests.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-1 mb-6 border-b border-gray-200">
          <button
            onClick={() => setSection("pending")}
            className={`px-3 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
              section === "pending"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            未生成
          </button>
          <button
            onClick={() => setSection("generated")}
            className={`px-3 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
              section === "generated"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            作成済み
            {(tab === "integrated" ? intReports : reports).length > 0 && (
              <span className="ml-1.5 text-xs text-gray-400">{(tab === "integrated" ? intReports : reports).length}</span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : section === "generated" ? (
          tab === "integrated" ? (
            intReports.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-gray-500">作成済みのレポートはありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500 mb-4">作成済み: {intReports.length}件</p>
                {intReports.map((r) => (
                  <div key={r.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {r.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          @{r.username}
                          <span className="ml-2">
                            {new Date(r.created_at).toLocaleDateString("ja-JP")} 作成
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        {r.viewed_at ? (
                          <span className="text-xs text-gray-400">閲覧済み</span>
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium">未閲覧</span>
                        )}
                        <button
                          onClick={() => resetViewed(r.request_id)}
                          disabled={!r.viewed_at}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          未閲覧に戻す
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : reports.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">作成済みのレポートはありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">作成済み: {reports.length}件</p>
              {reports.map((r) => (
                <div key={r.id} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {r.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        @{r.username}
                        <span className="ml-2">
                          {new Date(r.created_at).toLocaleDateString("ja-JP")} 作成
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {r.viewed_at ? (
                        <span className="text-xs text-gray-400">閲覧済み</span>
                      ) : (
                        <span className="text-xs text-emerald-600 font-medium">未閲覧</span>
                      )}
                      <button
                        onClick={() => resetViewed(r.session_id)}
                        disabled={!r.viewed_at}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        未閲覧に戻す
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tab === "integrated" ? (
          intRequests.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500">レポート未生成のリクエストはありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                レポート未生成: {intRequests.length}件
              </p>
              {intRequests.map((r) => {
                const rid = r.request_id;
                const isExpanded = expandedPrompt === rid;
                const isLoadingThis = loadingPrompt === rid;

                return (
                  <div
                    key={rid}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {r.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          @{r.username}
                          <span className="ml-2">
                            {new Date(r.created_at).toLocaleDateString("ja-JP")} リクエスト
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {[r.topic1, r.topic2, r.topic3].map((t) => TOPIC_LABELS[t] ?? `#${t}`).join(" / ")}
                        </p>
                      </div>
                      <button
                        onClick={() => togglePrompt(rid)}
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

                    {isExpanded && promptContent[rid] && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-medium text-gray-500">
                            Claude Code に渡すプロンプト
                          </p>
                          <button
                            onClick={() => copyPrompt(rid)}
                            className="text-xs text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer"
                          >
                            コピー
                          </button>
                        </div>
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-white border border-gray-200 rounded-md p-4 max-h-[400px] overflow-y-auto leading-relaxed">
                          {promptContent[rid]}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : pendingSessions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">レポート未生成のセッションはありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">
              レポート未生成: {pendingSessions.length}件
            </p>
            {pendingSessions.map((s) => {
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
                        {s.name}
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
                      onClick={() => togglePrompt(sid)}
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
