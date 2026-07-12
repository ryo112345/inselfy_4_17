"use client";

import Image from "next/image";
import { useState } from "react";
import { ACCENT } from "@/constants/theme";

export function Gallery({ urls }: { urls: string[] }) {
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent((c) => (c - 1 + urls.length) % urls.length);
  const next = () => setCurrent((c) => (c + 1) % urls.length);

  return (
    <div>
      <div className="group relative aspect-video overflow-hidden bg-gray-100">
        <Image
          src={urls[current]}
          alt=""
          fill
          sizes="(max-width: 896px) 100vw, 896px"
          className="object-contain"
        />

        {urls.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm opacity-0 transition-all hover:bg-white group-hover:opacity-100"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm opacity-0 transition-all hover:bg-white group-hover:opacity-100"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {urls.length > 1 && (
          <div className="absolute bottom-3 right-3 rounded-full bg-black/50 px-3 py-1 text-xs font-medium text-white">
            {current + 1} / {urls.length}
          </div>
        )}
      </div>

      {urls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {urls.map((url, i) => (
            <button
              type="button"
              key={url}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 cursor-pointer overflow-hidden rounded-lg transition-opacity ${
                i === current ? "opacity-100" : "opacity-40 hover:opacity-70"
              }`}
              style={
                i === current
                  ? {
                      outline: `2px solid ${ACCENT}`,
                      outlineOffset: "1px",
                    }
                  : undefined
              }
            >
              <Image src={url} alt="" width={80} height={56} className="h-14 w-20 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
