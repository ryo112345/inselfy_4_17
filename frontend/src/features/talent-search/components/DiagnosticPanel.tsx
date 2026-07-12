"use client";

import type { useTalentSearch } from "../useTalentSearch";

const VALUE_LABELS: Record<string, string> = {
  achievement: "達成",
  status: "地位名声",
  autonomy: "自主性",
  safety: "支援",
  altruism: "人間関係",
  comfort: "労働条件",
};

const CI_TYPE_LABELS: Record<string, string> = {
  R: "現実的",
  I: "研究的",
  A: "芸術的",
  S: "社会的",
  E: "企業的",
  C: "慣習的",
};

/** 診断マッチング設定パネル（Layer 2: チーム選択 or カスタムスライダー） */
export function DiagnosticPanel({ search }: { search: ReturnType<typeof useTalentSearch> }) {
  const {
    diagnosticMode,
    setDiagnosticMode,
    diagnosticType,
    setDiagnosticType,
    teams,
    selectedTeamId,
    setSelectedTeamId,
    customWeights,
    setCustomWeights,
    customCIWeights,
    setCustomCIWeights,
    hasDiagnosticConfig,
  } = search;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg
            aria-hidden="true"
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="font-medium text-gray-700">マッチング</span>
        </div>

        <div className="flex gap-0.5 rounded-lg bg-gray-100 p-0.5">
          {(
            [
              ["wv", "価値観"],
              ["ci", "適職"],
              ["integrated", "総合"],
            ] as const
          ).map(([key, label]) => (
            <button
              type="button"
              key={key}
              onClick={() => setDiagnosticType(key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                diagnosticType === key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-gray-200" />

        <select
          value={diagnosticMode}
          onChange={(e) => setDiagnosticMode(e.target.value as "team" | "custom")}
          className="rounded-lg border border-gray-200 py-1.5 px-2.5 text-xs text-gray-700 outline-none focus:border-blue-400 cursor-pointer"
        >
          <option value="team">チームから選択</option>
          <option value="custom">カスタム設定</option>
        </select>

        {diagnosticMode === "team" && (
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className={`rounded-lg border py-1.5 px-2.5 text-xs outline-none focus:border-blue-400 cursor-pointer min-w-[160px] transition-colors ${
              selectedTeamId
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-gray-200 text-gray-700"
            }`}
          >
            <option value="">チームを選択...</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        )}

        {!hasDiagnosticConfig && (
          <span className="text-[11px] text-gray-400 italic">
            チームまたはカスタム設定で候補者をマッチ度順に表示
          </span>
        )}
      </div>

      {/* Custom sliders */}
      {diagnosticMode === "custom" &&
        (diagnosticType === "wv" || diagnosticType === "integrated") && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {diagnosticType === "integrated" && (
              <p className="text-[11px] font-medium text-gray-500 mb-2">価値観（Work Values）</p>
            )}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-1.5">
              {Object.entries(VALUE_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-12 text-xs text-gray-600 shrink-0">{label}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={customWeights[key]}
                    onChange={(e) =>
                      setCustomWeights({ ...customWeights, [key]: Number(e.target.value) })
                    }
                    className="flex-1 accent-blue-600 cursor-pointer h-4"
                  />
                  <span className="w-6 text-right text-xs font-mono text-gray-400">
                    {customWeights[key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      {diagnosticMode === "custom" &&
        (diagnosticType === "ci" || diagnosticType === "integrated") && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {diagnosticType === "integrated" && (
              <p className="text-[11px] font-medium text-gray-500 mb-2">適職（Career Interest）</p>
            )}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-1.5">
              {Object.entries(CI_TYPE_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-12 text-xs text-gray-600 shrink-0">{label}</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={customCIWeights[key]}
                    onChange={(e) =>
                      setCustomCIWeights({ ...customCIWeights, [key]: Number(e.target.value) })
                    }
                    className="flex-1 accent-purple-600 cursor-pointer h-4"
                  />
                  <span className="w-6 text-right text-xs font-mono text-gray-400">
                    {customCIWeights[key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
