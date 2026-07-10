"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function MobilePostButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <Link
      href="/compose"
      className="fixed right-4 z-40 flex items-center justify-center w-14 h-14 rounded-full text-white shadow-[0_4px_14px_rgba(0,0,0,0.25),0_1px_3px_rgba(0,0,0,0.15)] active:scale-95 active:shadow-[0_2px_6px_rgba(0,0,0,0.2)] transition-[transform,box-shadow] md:hidden"
      style={{
        backgroundColor: "var(--accent)",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)",
      }}
    >
      <svg
        width={24}
        height={24}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>,
    document.body,
  );
}
