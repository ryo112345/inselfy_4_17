"use client";

import { useState } from "react";

const navItems1 = ["ホーム", "さがす", "求人", "つくる", "プロフィール"];
const navItems2 = ["診断", "気になる", "メッセージ", "スカウト"];

export default function SidebarColorsPage() {
  const [bg, setBg] = useState("#f9f8f4");
  const [border, setBorder] = useState("#ece9e0");
  const [hover, setHover] = useState("#f2f0e8");
  const [hovered, setHovered] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex min-h-screen">
      <aside
        className="shrink-0 flex flex-col h-screen sticky top-0 transition-all duration-200"
        style={{
          width: sidebarOpen ? 240 : 52,
          backgroundColor: bg,
          borderRight: `1px solid ${border}`,
        }}
      >
        <div className="flex items-center justify-between px-3 h-14 shrink-0">
          {sidebarOpen && <span className="text-lg font-semibold text-gray-900">Inselfy</span>}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 cursor-pointer ml-auto transition-colors"
            style={{ backgroundColor: hovered === "menu" ? hover : "transparent" }}
            onMouseEnter={() => setHovered("menu")}
            onMouseLeave={() => setHovered(null)}
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {sidebarOpen ? (
                <>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M9 3v18" />
                </>
              ) : (
                <path d="M3 12h18M3 6h18M3 18h18" />
              )}
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-1">
          <ul className="space-y-0.5">
            {navItems1.map((label) => (
              <li key={label}>
                <div
                  className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-700 cursor-pointer transition-colors"
                  style={{ backgroundColor: hovered === label ? hover : "transparent" }}
                  onMouseEnter={() => setHovered(label)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className="shrink-0 w-5 h-5 rounded bg-gray-400/30" />
                  {sidebarOpen && <span>{label}</span>}
                </div>
              </li>
            ))}
          </ul>

          <div className="my-2 mx-2 border-t" style={{ borderColor: border }} />

          <ul className="space-y-0.5">
            {navItems2.map((label) => (
              <li key={label}>
                <div
                  className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-700 cursor-pointer transition-colors"
                  style={{ backgroundColor: hovered === label ? hover : "transparent" }}
                  onMouseEnter={() => setHovered(label)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className="shrink-0 w-5 h-5 rounded bg-gray-400/30" />
                  {sidebarOpen && <span>{label}</span>}
                </div>
              </li>
            ))}
          </ul>

          {sidebarOpen && (
            <>
              <div className="my-2 mx-2 border-t" style={{ borderColor: border }} />
              <div className="px-2 py-1">
                <p className="text-xs font-semibold text-gray-900 mb-0.5">最近の診断</p>
                <div
                  className="rounded-md px-2 py-1.5 cursor-pointer transition-colors"
                  style={{ backgroundColor: hovered === "wv" ? hover : "transparent" }}
                  onMouseEnter={() => setHovered("wv")}
                  onMouseLeave={() => setHovered(null)}
                >
                  <p className="text-sm text-gray-500">価値観診断</p>
                  <p className="text-xs">
                    <span className="text-gray-900">2026/4/16</span>
                    <span className="ml-3 text-gray-400">責任・創造性・自律性</span>
                  </p>
                </div>
                <div
                  className="rounded-md px-2 py-1.5 cursor-pointer transition-colors"
                  style={{ backgroundColor: hovered === "ci" ? hover : "transparent" }}
                  onMouseEnter={() => setHovered("ci")}
                  onMouseLeave={() => setHovered(null)}
                >
                  <p className="text-sm text-gray-500">キャリア興味診断</p>
                  <p className="text-xs">
                    <span className="text-gray-900">2026/4/16</span>
                    <span className="ml-3 text-gray-400">企業的・慣習的・研究的</span>
                  </p>
                </div>
              </div>
            </>
          )}
        </nav>

        <div
          className="shrink-0 px-2 py-2 space-y-0.5"
          style={{ borderTop: `1px solid ${border}` }}
        >
          <div
            className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-700 cursor-pointer transition-colors"
            style={{ backgroundColor: hovered === "dl" ? hover : "transparent" }}
            onMouseEnter={() => setHovered("dl")}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="shrink-0 w-5 h-5 rounded bg-gray-400/30" />
            {sidebarOpen && <span>ダウンロード</span>}
          </div>
          <div
            className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-gray-700 cursor-pointer transition-colors"
            style={{ backgroundColor: hovered === "user" ? hover : "transparent" }}
            onMouseEnter={() => setHovered("user")}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="flex shrink-0 w-5 h-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              秋
            </span>
            {sidebarOpen && <span>秋山椋</span>}
          </div>
        </div>
      </aside>

      <div className="flex-1 p-8 bg-[#f6f7f5]">
        <h1 className="text-xl font-bold mb-6">サイドバー色調整</h1>
        <div className="space-y-4 max-w-md">
          <ColorInput label="背景色" value={bg} onChange={setBg} />
          <ColorInput label="ボーダー色" value={border} onChange={setBorder} />
          <ColorInput label="ホバー色" value={hover} onChange={setHover} />
        </div>
        <div className="mt-8 p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Sidebar.tsx に貼り付け:</p>
          <pre className="text-sm font-mono text-gray-900 select-all whitespace-pre-wrap">{`bg: ${bg}\nborder: ${border}\nhover: ${hover}`}</pre>
        </div>
      </div>
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <label className="w-24 text-sm font-medium text-gray-700">{label}</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 rounded cursor-pointer border border-gray-300"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 px-2 py-1 text-sm font-mono border border-gray-300 rounded"
      />
    </div>
  );
}
