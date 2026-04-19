"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import type { DiagnosticSummary } from "@/features/profile/fetchPanelData";

type Props = {
  username: string;
  displayName?: string | null;
  diagnostics?: DiagnosticSummary[];
  defaultOpen?: boolean;
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
  { label: "気になる", href: "/bookmarks", icon: BookmarkIcon },
  { label: "メッセージ", href: "/messages", icon: ChatIcon },
  { label: "スカウト", href: "/scout", icon: SendIcon },
];

const assessmentItems = [
  { label: "価値観診断", href: "/work_values" },
  { label: "職業興味診断", href: "/career_interest/start" },
];

export function Sidebar({ username, displayName, diagnostics = [], defaultOpen = false, debug }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  const [assessmentOpen, setAssessmentOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const assessmentRef = useRef<HTMLDivElement>(null);
  const assessmentTriggerRef = useRef<HTMLButtonElement>(null);
  const initialRender = useRef(true);
  const { user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!menuOpen && !assessmentOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuOpen && menuRef.current && !menuRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (assessmentOpen && assessmentRef.current && !assessmentRef.current.contains(target) &&
        assessmentTriggerRef.current && !assessmentTriggerRef.current.contains(target)) {
        setAssessmentOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen, assessmentOpen]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push("/login");
  }, [logout, router]);

  useEffect(() => {
    initialRender.current = false;
  }, []);

  useEffect(() => {
    document.cookie = `sidebar-open=${open}; path=/; max-age=31536000; SameSite=Lax`;
  }, [open]);

  const profileHref = `/profile/${user?.username ?? username}`;
  const myDisplayName = user?.name ?? displayName;
  const initial = myDisplayName ? myDisplayName.charAt(0) : (user?.username ?? username).charAt(0);

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
      <div
        data-sidebar
        className={`fixed top-0 left-0 z-50 h-screen overflow-hidden ${initialRender.current ? "" : "transition-[width] duration-200 ease-in-out"} ${open ? "w-72" : "w-[50px]"}`}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className="sb-item absolute right-2 top-3 z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-500 cursor-pointer transition-colors"
        >
          <PanelCloseIcon />
        </button>
        <aside
          className="flex h-full w-72 flex-col"
        >
          <div className="flex items-center h-14 shrink-0 px-2">
            {open && (
              <span className="text-lg font-semibold text-gray-900 whitespace-nowrap ml-2">
                Inselfy
              </span>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-1">
            <ul className="space-y-0.5">
              {navItems.map((item) => {
                const href = item.href ?? profileHref;
                return (
                  <li key={item.label}>
                    <Link
                      href={href}
                      className={`sb-item flex items-center rounded-md py-2 px-2 text-sm text-gray-700 transition-colors gap-3 ${open ? "" : "w-9"}`}
                    >
                      <span className="shrink-0 w-5 h-5">
                        <item.icon />
                      </span>
                      <span className="whitespace-nowrap">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="sb-divider my-2 mx-2 border-t" />

            <ul className="space-y-0.5">
              <li>
                <button
                  ref={assessmentTriggerRef}
                  onClick={(e) => { e.stopPropagation(); setAssessmentOpen(!assessmentOpen); }}
                  className={`sb-item flex items-center rounded-md py-2 px-2 text-sm text-gray-700 transition-colors gap-3 cursor-pointer ${open ? "w-full" : "w-9"}`}
                >
                  <span className="shrink-0 w-5 h-5">
                    <CompassIcon />
                  </span>
                  <span className="whitespace-nowrap">診断</span>
                </button>
              </li>
              {navItems2.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={`sb-item flex items-center rounded-md py-2 px-2 text-sm text-gray-700 transition-colors gap-3 ${open ? "" : "w-9"}`}
                  >
                    <span className="shrink-0 w-5 h-5">
                      <item.icon />
                    </span>
                    <span className="whitespace-nowrap">{item.label}</span>
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
                        <p className="text-xs whitespace-nowrap">
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

          <div className="shrink-0 px-1 py-2 space-y-0.5">
            <button
              ref={triggerRef}
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className={`sb-item flex items-center rounded-md py-2 px-1 text-sm text-gray-700 transition-colors gap-3 cursor-pointer ${open ? "w-full" : "w-11"}`}
            >
              <span className="flex shrink-0 w-9 h-9 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white leading-none">
                {initial}
              </span>
              <span className="whitespace-nowrap">{myDisplayName ?? user?.username ?? username}</span>
            </button>
          </div>
        </aside>
      </div>

      {assessmentOpen && (
        <AssessmentMenu
          ref={assessmentRef}
          triggerRef={assessmentTriggerRef}
          sidebarOpen={open}
          onClose={() => setAssessmentOpen(false)}
        />
      )}

      {menuOpen && (
        <UserMenu
          ref={menuRef}
          triggerRef={triggerRef}
          email={user?.email ?? username}
          onClose={() => setMenuOpen(false)}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}

import { forwardRef } from "react";

const AssessmentMenu = forwardRef<
  HTMLDivElement,
  {
    triggerRef: React.RefObject<HTMLButtonElement | null>;
    sidebarOpen: boolean;
    onClose: () => void;
  }
>(function AssessmentMenu({ triggerRef, sidebarOpen, onClose }, ref) {
  const [top, setTop] = useState(0);

  useEffect(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setTop(rect.bottom + 4);
    }
  }, [triggerRef]);

  return (
    <div
      ref={ref}
      className="fixed w-52 rounded-xl border border-gray-200 bg-white shadow-lg py-1 z-[60]"
      style={{ top, left: sidebarOpen ? 8 : 4 }}
    >
      {assessmentItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={onClose}
        >
          {item.label}
        </Link>
      ))}
    </div>
  );
});

const UserMenu = forwardRef<
  HTMLDivElement,
  {
    triggerRef: React.RefObject<HTMLButtonElement | null>;
    email: string;
    onClose: () => void;
    onLogout: () => void;
  }
>(function UserMenu({ triggerRef, email, onClose, onLogout }, ref) {
  const [pos, setPos] = useState<{ bottom: number; left: number } | null>(null);

  useEffect(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ bottom: window.innerHeight - rect.top + 4, left: rect.left });
    }
  }, [triggerRef]);

  if (!pos) return null;

  return (
    <div
      ref={ref}
      className="fixed w-64 rounded-xl border border-gray-200 bg-white shadow-lg py-1 z-[60]"
      style={{ bottom: pos.bottom, left: pos.left }}
    >
      <div className="px-4 py-2 text-sm text-gray-500 truncate">
        {email}
      </div>

      <div className="py-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={onClose}
        >
          <span className="w-5 h-5 text-gray-500"><SettingsIcon /></span>
          設定
        </Link>
        <Link
          href="/help"
          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={onClose}
        >
          <span className="w-5 h-5 text-gray-500"><HelpIcon /></span>
          ヘルプを表示
        </Link>
      </div>

      <div className="border-t border-gray-100 my-1" />

      <button
        onClick={onLogout}
        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <span className="w-5 h-5 text-gray-500"><LogoutIcon /></span>
        ログアウト
      </button>
    </div>
  );
});

function MenuIcon() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
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
      strokeWidth={1.5}
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

function SettingsIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
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
