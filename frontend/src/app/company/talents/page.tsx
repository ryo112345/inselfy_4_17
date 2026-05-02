"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCompanyAuth } from "@/features/company-auth/company-auth-context";

type TalentCard = {
  user_id: string;
  username: string;
  name: string;
  headline: string | null;
  avatar_url: string | null;
  profile_color: string | null;
  job_seeking_status: string | null;
  skills: string[];
  experiences: { company_name: string; title: string }[];
  top_wv_labels: string[];
  top_ci_labels: string[];
  similarity?: number;
};

type Team = {
  id: string;
  name: string;
};

const SEEKING_STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  actively_looking:  { label: "積極的に探している", bg: "bg-emerald-50", text: "text-emerald-700" },
  open:              { label: "良い話があれば", bg: "bg-amber-50", text: "text-amber-700" },
  not_looking:       { label: "今は探していない", bg: "bg-gray-100", text: "text-gray-500" },
};

const VALUE_LABELS: Record<string, string> = {
  achievement: "達成",
  comfort: "快適さ",
  status: "地位",
  altruism: "利他",
  safety: "安全",
  autonomy: "自律",
};

const CI_TYPE_LABELS: Record<string, string> = {
  R: "現実的",
  I: "研究的",
  A: "芸術的",
  S: "社会的",
  E: "企業的",
  C: "慣習的",
};

export default function TalentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { companyFetch } = useCompanyAuth();

  const initialTab = searchParams.get("tab") === "diagnostic" ? "diagnostic" : "condition";
  const initialTeamId = searchParams.get("team") ?? "";

  const [tab, setTab] = useState<"condition" | "diagnostic">(initialTab);
  const [users, setUsers] = useState<TalentCard[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const PAGE_SIZE = 20;

  // Condition filters
  const [keyword, setKeyword] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [industry, setIndustry] = useState("");
  const [seekingStatus, setSeekingStatus] = useState("");
  const [jobType, setJobType] = useState("");

  // Diagnostic filters
  const [diagnosticMode, setDiagnosticMode] = useState<"team" | "custom">(initialTeamId ? "team" : "team");
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState(initialTeamId);
  const [customWeights, setCustomWeights] = useState<Record<string, number>>({
    achievement: 50, comfort: 50, status: 50, altruism: 50, safety: 50, autonomy: 50,
  });
  const [diagnosticType, setDiagnosticType] = useState<"wv" | "ci" | "integrated">("wv");
  const [customCIWeights, setCustomCIWeights] = useState<Record<string, number>>({
    R: 50, I: 50, A: 50, S: 50, E: 50, C: 50,
  });

  useEffect(() => {
    companyFetch("/api/company/teams")
      .then((r) => r.json())
      .then((data) => setTeams(data.teams ?? []))
      .catch(() => {});
  }, [companyFetch]);

  // Auto-search when coming from team page
  useEffect(() => {
    if (initialTab === "diagnostic" && initialTeamId) {
      handleDiagnosticSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildConditionParams = useCallback((offset: number) => {
    const params = new URLSearchParams();
    if (keyword) params.set("q", keyword);
    if (skills.length > 0) params.set("skills", skills.join(","));
    if (location) params.set("location", location);
    if (industry) params.set("industry", industry);
    if (seekingStatus) params.set("job_seeking_status", seekingStatus);
    if (jobType) params.set("job_type", jobType);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));
    return params;
  }, [keyword, skills, location, industry, seekingStatus, jobType]);

  const getDiagnosticEndpoint = useCallback(() => {
    switch (diagnosticType) {
      case "ci": return "/api/company/talents/search/diagnostic/ci";
      case "integrated": return "/api/company/talents/search/diagnostic/integrated";
      default: return "/api/company/talents/search/diagnostic";
    }
  }, [diagnosticType]);

  const buildDiagnosticParams = useCallback((offset: number) => {
    const params = new URLSearchParams();
    if (diagnosticMode === "team" && selectedTeamId) {
      params.set("team_id", selectedTeamId);
    } else if (diagnosticMode === "custom") {
      if (diagnosticType === "wv" || diagnosticType === "integrated") {
        for (const [k, v] of Object.entries(customWeights)) {
          params.set(`wv_${k}`, String(v));
        }
      }
      if (diagnosticType === "ci" || diagnosticType === "integrated") {
        for (const [k, v] of Object.entries(customCIWeights)) {
          params.set(`ci_${k}`, String(v));
        }
      }
    }
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(offset));
    return params;
  }, [diagnosticMode, diagnosticType, selectedTeamId, customWeights, customCIWeights]);

  const fetchTalents = useCallback(async (endpoint: string, params: URLSearchParams, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setSearched(true);
    }
    try {
      const res = await companyFetch(`${endpoint}?${params}`);
      const data = await res.json();
      const newUsers = data.users ?? [];
      setUsers((prev) => append ? [...prev, ...newUsers] : newUsers);
      setTotal(data.total ?? 0);
    } catch {
      if (!append) { setUsers([]); setTotal(0); }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [companyFetch]);

  const handleConditionSearch = useCallback(() => {
    fetchTalents("/api/company/talents/search", buildConditionParams(0), false);
  }, [fetchTalents, buildConditionParams]);

  const handleDiagnosticSearch = useCallback(() => {
    if (diagnosticMode === "team" && !selectedTeamId) return;
    fetchTalents(getDiagnosticEndpoint(), buildDiagnosticParams(0), false);
  }, [fetchTalents, getDiagnosticEndpoint, buildDiagnosticParams, diagnosticMode, selectedTeamId]);

  const handleLoadMore = useCallback(() => {
    const offset = users.length;
    if (tab === "condition") {
      fetchTalents("/api/company/talents/search", buildConditionParams(offset), true);
    } else {
      fetchTalents(getDiagnosticEndpoint(), buildDiagnosticParams(offset), true);
    }
  }, [tab, users.length, fetchTalents, buildConditionParams, getDiagnosticEndpoint, buildDiagnosticParams]);

  const handleSearch = tab === "condition" ? handleConditionSearch : handleDiagnosticSearch;

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
    }
    setSkillInput("");
  };

  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const switchTab = (t: "condition" | "diagnostic") => {
    setTab(t);
    setUsers([]);
    setTotal(0);
    setSearched(false);
    const params = new URLSearchParams(searchParams);
    params.set("tab", t);
    if (t !== "diagnostic") params.delete("team");
    router.replace(`/company/talents?${params}`, { scroll: false });
  };

  const accentColor = "#2979ff";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">人材を探す</h1>
        <p className="text-sm text-gray-500">条件やチームの診断傾向から候補者を検索できます</p>
      </div>

      {/* Segmented Control */}
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 mb-6">
        <button
          onClick={() => switchTab("condition")}
          className={`rounded-md px-5 py-2 text-sm font-medium transition-all cursor-pointer ${
            tab === "condition" ? "text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
          style={tab === "condition" ? { backgroundColor: accentColor } : {}}
        >
          条件検索
        </button>
        <button
          onClick={() => switchTab("diagnostic")}
          className={`rounded-md px-5 py-2 text-sm font-medium transition-all cursor-pointer ${
            tab === "diagnostic" ? "text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
          }`}
          style={tab === "diagnostic" ? { backgroundColor: accentColor } : {}}
        >
          診断検索
        </button>
      </div>

      {/* Condition Search Filters */}
      {tab === "condition" && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
          <div className="space-y-4">
            {/* Keyword */}
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                width={16} height={16} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="キーワード（名前・肩書き・自己紹介）"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
              />
            </div>

            {/* Skills */}
            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="スキルを追加（例: Go, React）"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addSkill(); }
                  }}
                  className="flex-1 rounded-lg border border-gray-200 py-2 px-3 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-colors"
                />
                <button
                  onClick={addSkill}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  追加
                </button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                    >
                      {s}
                      <button onClick={() => removeSkill(s)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  <button
                    onClick={() => setSkills([])}
                    className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    すべてクリア
                  </button>
                </div>
              )}
            </div>

            {/* Dropdowns row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="rounded-lg border border-gray-200 py-2 px-3 text-sm text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
              >
                <option value="">勤務地</option>
                <option value="東京">東京</option>
                <option value="大阪">大阪</option>
                <option value="名古屋">名古屋</option>
                <option value="福岡">福岡</option>
                <option value="リモート">リモート</option>
              </select>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="rounded-lg border border-gray-200 py-2 px-3 text-sm text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
              >
                <option value="">業界</option>
                <option value="IT">IT</option>
                <option value="金融">金融</option>
                <option value="製造">製造</option>
                <option value="コンサルティング">コンサルティング</option>
                <option value="医療">医療</option>
              </select>
              <select
                value={seekingStatus}
                onChange={(e) => setSeekingStatus(e.target.value)}
                className="rounded-lg border border-gray-200 py-2 px-3 text-sm text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
              >
                <option value="">転職意欲</option>
                <option value="actively_looking">積極的に探している</option>
                <option value="open">良い話があれば</option>
                <option value="not_looking">今は探していない</option>
              </select>
              <select
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                className="rounded-lg border border-gray-200 py-2 px-3 text-sm text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
              >
                <option value="">職種</option>
                <option value="エンジニア">エンジニア</option>
                <option value="デザイナー">デザイナー</option>
                <option value="PM">PM</option>
                <option value="営業">営業</option>
                <option value="マーケティング">マーケティング</option>
              </select>
            </div>

            <button
              onClick={handleSearch}
              disabled={loading}
              className="rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: accentColor }}
            >
              {loading ? "検索中..." : "検索する"}
            </button>
          </div>
        </div>
      )}

      {/* Diagnostic Search Filters */}
      {tab === "diagnostic" && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
          <div className="space-y-5">
            {/* Diagnostic type selector */}
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
              {([["wv", "Work Values"], ["ci", "Career Interest"], ["integrated", "総合"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setDiagnosticType(key)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    diagnosticType === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Mode selector */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="diag-mode"
                  checked={diagnosticMode === "team"}
                  onChange={() => setDiagnosticMode("team")}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">チームから選択</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="diag-mode"
                  checked={diagnosticMode === "custom"}
                  onChange={() => setDiagnosticMode("custom")}
                  className="accent-blue-600"
                />
                <span className="text-sm text-gray-700">カスタム設定</span>
              </label>
            </div>

            {diagnosticMode === "team" && (
              <div>
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 py-2.5 px-3 text-sm text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
                >
                  <option value="">チームを選択してください</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-gray-400">
                  {diagnosticType === "ci"
                    ? "チームメンバーのCareer Interest平均スコアに近い候補者を検索します"
                    : diagnosticType === "integrated"
                    ? "チームメンバーのWV・CI両方の平均スコアに近い候補者を検索します"
                    : "チームメンバーのWork Values平均スコアに近い候補者を検索します"}
                </p>
              </div>
            )}

            {diagnosticMode === "custom" && (diagnosticType === "wv" || diagnosticType === "integrated") && (
              <div className="space-y-3">
                {diagnosticType === "integrated" ? (
                  <p className="text-xs font-medium text-gray-600">Work Values</p>
                ) : (
                  <p className="text-xs text-gray-500">求める人材の価値観を0〜100で設定してください</p>
                )}
                {Object.entries(VALUE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-16 text-sm text-gray-600 shrink-0">{label}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={customWeights[key]}
                      onChange={(e) => setCustomWeights({ ...customWeights, [key]: Number(e.target.value) })}
                      className="flex-1 accent-blue-600 cursor-pointer"
                    />
                    <span className="w-8 text-right text-sm font-mono text-gray-500">{customWeights[key]}</span>
                  </div>
                ))}
              </div>
            )}

            {diagnosticMode === "custom" && (diagnosticType === "ci" || diagnosticType === "integrated") && (
              <div className="space-y-3">
                {diagnosticType === "integrated" ? (
                  <p className="text-xs font-medium text-gray-600">Career Interest</p>
                ) : (
                  <p className="text-xs text-gray-500">求める人材の興味傾向を0〜100で設定してください</p>
                )}
                {Object.entries(CI_TYPE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-16 text-sm text-gray-600 shrink-0">{label}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={customCIWeights[key]}
                      onChange={(e) => setCustomCIWeights({ ...customCIWeights, [key]: Number(e.target.value) })}
                      className="flex-1 accent-purple-600 cursor-pointer"
                    />
                    <span className="w-8 text-right text-sm font-mono text-gray-500">{customCIWeights[key]}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleSearch}
              disabled={loading || (diagnosticMode === "team" && !selectedTeamId)}
              className="rounded-lg px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: accentColor }}
            >
              {loading ? "検索中..." : "マッチング検索"}
            </button>
          </div>
        </div>
      )}

      {/* Results header */}
      {searched && !loading && (
        <div className="mb-4">
          <p className="text-sm text-gray-500">
            {total > 0
              ? `${total}件中 ${users.length}件を表示`
              : "条件に合う候補者が見つかりませんでした"}
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-gray-200" />
                  <div className="h-3 w-48 rounded bg-gray-200" />
                </div>
              </div>
              <div className="h-3 w-full rounded bg-gray-100 mb-2" />
              <div className="h-3 w-3/4 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      )}

      {/* Results grid */}
      {!loading && users.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {users.map((u) => (
              <CandidateCard key={u.user_id} user={u} showSimilarity={tab === "diagnostic"} />
            ))}
          </div>

          {users.length < total && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-lg border border-gray-200 bg-white px-8 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {loadingMore ? "読み込み中..." : "もっと見る"}
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {searched && !loading && users.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={1.5}>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">検索条件を変更して再度お試しください</p>
        </div>
      )}
    </div>
  );
}

function CandidateCard({ user: u, showSimilarity }: { user: TalentCard; showSimilarity: boolean }) {
  const status = u.job_seeking_status ? SEEKING_STATUS_MAP[u.job_seeking_status] : null;

  const initials = u.name
    .split(/\s/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2);
  const avatarBg = u.profile_color ?? "#94a3b8";

  return (
    <Link
      href={`/profile/${u.username}`}
      className="group block rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {u.avatar_url ? (
            <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
          ) : (
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ backgroundColor: avatarBg }}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {u.name}
            </p>
            {u.headline && (
              <p className="text-xs text-gray-500 truncate">{u.headline}</p>
            )}
          </div>
        </div>

        {showSimilarity && u.similarity != null && (
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-white"
            style={{ backgroundColor: u.similarity >= 80 ? "#2979ff" : u.similarity >= 60 ? "#64b5f6" : "#9ca3af" }}
          >
            {Math.round(u.similarity)}%
          </span>
        )}
      </div>

      {/* Experiences */}
      {u.experiences.length > 0 && (
        <div className="mb-3 space-y-1">
          {u.experiences.map((exp, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
              <svg className="shrink-0 text-gray-400" width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="7" width="18" height="14" rx="2" />
                <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
              <span className="truncate">{exp.company_name}</span>
              <span className="text-gray-300">·</span>
              <span className="truncate text-gray-500">{exp.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {u.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {u.skills.map((s) => (
            <span key={s} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Bottom row: status + diagnostic labels */}
      <div className="flex items-center gap-2 flex-wrap">
        {status && (
          <span className={`rounded-full px-2 py-0.5 text-xs ${status.bg} ${status.text}`}>
            {status.label}
          </span>
        )}
        {u.top_wv_labels.length > 0 && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
            WV: {u.top_wv_labels.join("・")}
          </span>
        )}
        {u.top_ci_labels.length > 0 && (
          <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-600">
            CI: {u.top_ci_labels.join("・")}
          </span>
        )}
      </div>
    </Link>
  );
}
