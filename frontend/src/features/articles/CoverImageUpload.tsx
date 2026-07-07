"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { uploadArticleImage } from "./api";

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
};

export function CoverImageUpload({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadArticleImage(file);
      onChange(url);
    } catch {
      // upload failed
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  if (value) {
    return (
      <div className="relative group">
        <Image
          src={value}
          alt="カバー画像"
          width={1600}
          height={900}
          sizes="(max-width: 768px) 100vw, 672px"
          className="w-full h-auto"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            変更
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-500/60 rounded-lg hover:bg-red-500/80 transition-colors"
          >
            削除
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="group w-full py-8 flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100/80 border-b border-gray-200/80 transition-colors cursor-pointer"
      >
        <svg
          width={28}
          height={28}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.2}
          className="text-gray-300 group-hover:text-gray-400 transition-colors"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span className="text-xs text-gray-400 group-hover:text-gray-500 transition-colors">
          {uploading ? "アップロード中…" : "カバー画像を追加"}
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
    </div>
  );
}
