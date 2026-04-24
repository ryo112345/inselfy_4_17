"use client";

import { useState, useRef } from "react";

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
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/articles/upload-image", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("upload failed");
      const data = await res.json();
      onChange(data.url);
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
        <img
          src={value}
          alt="カバー画像"
          className="w-full aspect-[2/1] object-cover rounded-lg"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-3">
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
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-500 transition-colors"
      >
        <svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        {uploading ? "アップロード中…" : "カバー画像を追加"}
      </button>
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
