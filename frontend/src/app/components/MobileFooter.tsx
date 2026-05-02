"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";

const navItems = [
  { href: "/", match: (p: string) => p === "/" },
  { href: "/search", match: (p: string) => p.startsWith("/search") },
  { href: "/articles", match: (p: string) => p.startsWith("/articles") && !p.startsWith("/articles/mine") && !p.startsWith("/articles/new") && !p.match(/\/articles\/[^/]+\/edit/) },
  { href: "/jobs", match: (p: string) => p.startsWith("/jobs") },
  { href: "/scout", match: (p: string) => p.startsWith("/scout") },
  { href: "__profile__", match: (p: string) => p.startsWith("/profile/") },
];

const count = navItems.length;

export function MobileFooter() {
  const pathname = usePathname();
  const { user } = useAuth();
  const profileHref = `/profile/${user?.username ?? "me"}`;
  const activeIndex = navItems.findIndex((item) => item.match(pathname));
  const prevIndex = useRef(activeIndex);
  const [displayIndex, setDisplayIndex] = useState(activeIndex);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (prevIndex.current !== activeIndex) {
      setAnimate(true);
      setDisplayIndex(activeIndex);
      prevIndex.current = activeIndex;
    }
  }, [activeIndex]);

  const pillLeft = `calc(${(displayIndex + 0.5) * 100 / count}% - 26px)`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <nav className="relative mx-3 mb-4 flex items-center justify-around rounded-[28px] h-[52px] bg-white/10 backdrop-blur-[2px] backdrop-saturate-125 border border-white/50 shadow-[0_2px_20px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.5)]">
        <span
          className={`absolute top-1/2 h-9 w-[52px] rounded-full bg-gray-500/30 ${animate ? "transition-[left] duration-500 ease-in-out" : ""}`}
          style={{ left: pillLeft, transform: "translateY(-50%)" }}
          onTransitionEnd={() => setAnimate(false)}
        />
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href === "__profile__" ? profileHref : item.href}
            className="relative z-10 flex items-center justify-center flex-1 h-full"
          >
            <Icons id={item.href} />
          </Link>
        ))}
      </nav>
    </div>
  );
}

function Icons({ id }: { id: string }) {
  const s = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", stroke: "#6b7280", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (id) {
    case "/": return (
      <svg {...s}><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" /><path d="M9 21V12h6v9" /></svg>
    );
    case "/search": return (
      <svg {...s}><circle cx="10.5" cy="10.5" r="7.5" /><path d="m21 21-4.5-4.5" /></svg>
    );
    case "/articles": return (
      <svg {...s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
    );
    case "/jobs": return (
      <svg {...s}><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M9 7v14" /><path d="M15 7v14" /></svg>
    );
    case "/scout": return (
      <svg {...s}><path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4z" /></svg>
    );
    case "__profile__": return (
      <svg {...s}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M18.5 18.5a7.5 7.5 0 0 0-13 0" /></svg>
    );
    default: return null;
  }
}
