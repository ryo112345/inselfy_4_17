"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "HOME", href: "/company", icon: HomeIcon },
  { label: "企業情報", href: "/company/profile", icon: CompanyIcon },
  { label: "求人一覧", href: "/company/jobs", icon: JobIcon },
  { label: "応募一覧", href: "/company/applications", icon: ApplicationIcon },
  { label: "人材を探す", href: "/company/talents", icon: TalentIcon },
  { label: "スカウト", href: "/company/scout", icon: ScoutIcon },
  { label: "メッセージ", href: "/company/messages", icon: MessageIcon },
  { label: "設定", href: "/company/settings", icon: SettingsIcon },
];

export function CompanyHeader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const accentColor = "#2979ff";

  const handleClose = () => {
    setCollapsed(true);
  };

  const handleTransitionEnd = () => {
    if (collapsed) {
      setVisible(false);
    }
  };

  const handleOpen = () => {
    setVisible(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setCollapsed(false);
      });
    });
  };

  return (
    <>
      {!visible && (
        <div className="flex h-12 items-center px-4">
          <button
            onClick={handleOpen}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-[#ece9e0] text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <HamburgerIcon />
          </button>
        </div>
      )}

      {visible && (
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            collapsed ? "max-h-0 opacity-0" : "max-h-52 opacity-100"
          }`}
          onTransitionEnd={handleTransitionEnd}
        >
          <header>
            <div className="border-b border-gray-200 bg-white">
              <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
                <div className="flex items-center gap-6">
                  <Link href="/company" className="text-xl font-bold" style={{ color: accentColor }}>
                    Inselfy
                  </Link>
                  <span className="text-sm text-gray-700">株式会社サンプル　担当者様</span>
                </div>
                <div className="flex items-center gap-4">
                  <Link
                    href="/company/manual"
                    className="text-sm font-medium hover:underline"
                    style={{ color: accentColor }}
                  >
                    マニュアル
                  </Link>
                  <button className="rounded border border-gray-300 px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer">
                    ログアウト
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <CloseIcon />
                  </button>
                </div>
              </div>
            </div>

            <style>{`
              .company-nav-item:hover:not(.company-nav-active) {
                background-color: color-mix(in srgb, var(--company-accent) 10%, transparent);
              }
            `}</style>
            <nav
              className="border-b-3 bg-white shadow-sm"
              style={{ borderColor: accentColor, "--company-accent": accentColor } as React.CSSProperties}
            >
              <div className="flex items-center justify-center">
                {navItems.map((item) => {
                  const isActive =
                    item.href === "/company"
                      ? pathname === "/company"
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`company-nav-item flex flex-col items-center gap-1.5 px-8 py-4 text-xs font-medium transition-colors relative ${isActive ? "company-nav-active" : ""}`}
                      style={
                        isActive
                          ? { color: "#fff", backgroundColor: accentColor }
                          : { color: "#4b5563" }
                      }
                    >
                      <span className="h-6 w-6">
                        <item.icon />
                      </span>
                      <span className="whitespace-nowrap">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </header>
        </div>
      )}
    </>
  );
}

function HamburgerIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function CompanyIcon() {
  return (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 6h2M13 6h2M9 10h2M13 10h2M9 14h2M13 14h2" />
      <path d="M10 22v-4h4v4" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3L4 9v12h5v-7h6v7h5V9z" />
    </svg>
  );
}

function JobIcon() {
  return (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M9 7v14" />
      <path d="M15 7v14" />
    </svg>
  );
}

function ApplicationIcon() {
  return (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  );
}

function TalentIcon() {
  return (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ScoutIcon() {
  return (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22l-4-9-9-4z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
