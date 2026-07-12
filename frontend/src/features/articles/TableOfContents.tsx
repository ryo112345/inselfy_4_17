"use client";

import { useCallback, useEffect, useState } from "react";

export type TOCItem = {
  id: string;
  text: string;
  level: number;
};

type Props = {
  items: TOCItem[];
};

export function TableOfContents({ items }: Props) {
  const [open, setOpen] = useState(true);
  const [activeId, setActiveId] = useState("");

  const updateActive = useCallback(() => {
    const offsets = items
      .map((item) => {
        const el = document.getElementById(item.id);
        if (!el) return null;
        return { id: item.id, top: el.getBoundingClientRect().top };
      })
      .filter(Boolean) as { id: string; top: number }[];

    const passed = offsets.filter((o) => o.top <= 100);
    setActiveId(passed.length > 0 ? passed[passed.length - 1].id : "");
  }, [items]);

  useEffect(() => {
    let raf: number;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateActive);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    updateActive();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [updateActive]);

  if (items.length < 2) return null;

  return (
    <div className="mb-8 py-4 px-5 rounded-lg bg-gray-50 border border-gray-200/60">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 cursor-pointer"
      >
        目次
        <svg
          aria-hidden="true"
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <nav className="mt-3 pt-3 border-t border-gray-200/60">
          <ol className="space-y-1 list-none">
            {items.map((item) => {
              const isActive = activeId === item.id;
              return (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className={`block py-1 text-sm transition-colors duration-150 ${
                      item.level === 3 ? "pl-4" : ""
                    } ${
                      isActive
                        ? "text-[var(--accent)] font-medium"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      document
                        .getElementById(item.id)
                        ?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  >
                    {item.text}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </div>
  );
}
