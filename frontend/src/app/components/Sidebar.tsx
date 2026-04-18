"use client";

import { useState } from "react";
import Link from "next/link";
import type { DiagnosticSummary } from "@/features/profile/fetchPanelData";

type Props = {
  username: string;
  displayName?: string | null;
  diagnostics?: DiagnosticSummary[];
  debug?: boolean;
};

const navItems = [
  { label: "ホーム", href: "/", icon: HomeIcon },
  { label: "さがす", href: "/search", icon: SearchIcon },
  { label: "求人", href: "/jobs", icon: BuildingIcon },
  { label: "つくる", href: "/create", icon: PenIcon },
  { label: "プロフィール", href: null, icon: PersonIcon },
];

const navItems2 = [
  { label: "診断", href: "/assessment", icon: CompassIcon },
  { label: "気になる", href: "/bookmarks", icon: BookmarkIcon },
  { label: "メッセージ", href: "/messages", icon: ChatIcon },
  { label: "スカウト", href: "/scout", icon: SendIcon },
];

export function Sidebar({ username, displayName, diagnostics = [], debug }: Props) {
  const [open, setOpen] = useState(false);

  const profileHref = `/profile/${username}`;
  const initial = displayName ? displayName.charAt(0) : username.charAt(0);

  return (
    <>
      <style>{`
        [data-sidebar] {
          --sidebar-bg: var(--sidebar-bg-override, #f9f8f4);
          --sidebar-border: var(--sidebar-border-override, #ece9e0);
          --sidebar-hover: var(--sidebar-hover-override, #f2f0e8);
          background-color: var(--sidebar-bg);
          border-right: 1px solid var(--sidebar-border);
        }
        [data-sidebar] .sb-divider { border-color: var(--sidebar-border); }
        [data-sidebar] .sb-item:hover { background-color: var(--sidebar-hover); }
      `}</style>
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        data-sidebar
        className={`fixed top-0 left-0 z-50 flex h-screen flex-col transition-all duration-200 ease-in-out ${open ? "w-72" : "w-[50px]"}`}
      >
        <div className="flex items-center h-14 shrink-0" style={{ padding: open ? "0 8px" : "0 6px" }}>
          <button
            onClick={() => setOpen(!open)}
            className="sb-item flex h-8 w-8 items-center justify-center rounded-md text-gray-500 cursor-pointer transition-colors"
          >
            {open ? <PanelCloseIcon /> : <MenuIcon />}
          </button>
          {open && (
            <span className="text-lg font-semibold text-gray-900 truncate ml-1.5">
              Inselfy
            </span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-1" style={{ padding: open ? "4px 8px" : "4px 6px" }}>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const href = item.href ?? profileHref;
              return (
                <li key={item.label}>
                  <Link
                    href={href}
                    className={`sb-item flex items-center rounded-md py-2 text-sm text-gray-700 transition-colors ${open ? "gap-3 px-2" : "justify-center"}`}
                  >
                    <span className="shrink-0 w-5 h-5">
                      <item.icon />
                    </span>
                    {open && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="sb-divider my-2 border-t" style={{ margin: open ? "8px 8px" : "8px 6px" }} />

          <ul className="space-y-0.5">
            {navItems2.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className={`sb-item flex items-center rounded-md py-2 text-sm text-gray-700 transition-colors ${open ? "gap-3 px-2" : "justify-center"}`}
                >
                  <span className="shrink-0 w-5 h-5">
                    <item.icon />
                  </span>
                  {open && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            ))}
          </ul>

          {open && diagnostics.length > 0 && (
            <>
              <div className="sb-divider my-2 mx-2 border-t" />
              <div className="px-2 py-1">
                <p className="text-xs font-semibold text-gray-900 mb-0.5">
                  最近の診断
                </p>
                {diagnostics.map((d) => (
                  <div key={d.href} className="mt-2">
                    <p className="text-sm text-gray-500 px-2">{d.label}</p>
                    <Link
                      href={d.href}
                      className="sb-item block rounded-md px-4 py-1 mt-0.5 transition-colors"
                    >
                      <p className="text-xs">
                        <span className="text-gray-900">{d.date}</span>
                        <span className="ml-3 text-gray-400">{d.keywords}</span>
                      </p>
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </nav>

        <div className="sb-divider shrink-0 border-t py-2 space-y-0.5" style={{ padding: open ? "8px 8px" : "8px 6px" }}>
          <button className={`sb-item flex w-full items-center rounded-md py-2 text-sm text-gray-700 transition-colors cursor-pointer ${open ? "gap-3 px-2" : "justify-center"}`}>
            <span className="shrink-0 w-5 h-5">
              <DownloadIcon />
            </span>
            {open && <span className="truncate">ダウンロード</span>}
          </button>
          <Link
            href={profileHref}
            className={`sb-item flex items-center rounded-md py-2 text-sm text-gray-700 transition-colors ${open ? "gap-3 px-2" : "justify-center"}`}
          >
            <span className="flex shrink-0 w-5 h-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              {initial}
            </span>
            {open && (
              <span className="truncate">{displayName ?? username}</span>
            )}
          </Link>
        </div>
      </aside>
    </>
  );
}

function MenuIcon() {
  return (
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
      <path d="M3 12h18M3 6h18M3 18h18" />
    </svg>
  );
}

function PanelCloseIcon() {
  return (
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
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10.5" cy="10.5" r="7.5" />
      <path d="m21 21-4.5-4.5" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M9 7v14" />
      <path d="M15 7v14" />
    </svg>
  );
}

function PenIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      <path d="M12 22h10" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="10" r="3" />
      <path d="M18.5 18.5a7.5 7.5 0 0 0-13 0" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22l-4-9-9-4z" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
