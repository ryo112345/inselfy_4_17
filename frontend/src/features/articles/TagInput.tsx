"use client";

import { useState, useRef } from "react";

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
  max?: number;
};

export function TagInput({ tags, onChange, max = 10 }: Props) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function addTag() {
    const tag = input.trim();
    if (!tag || tags.includes(tag) || tags.length >= max) return;
    onChange([...tags, tag]);
    setInput("");
  }

  function removeTag(index: number) {
    onChange(tags.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
    if (e.key === "Backspace" && input === "" && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  }

  return (
    <div>
      <div
        className="flex flex-wrap items-center gap-1.5 p-2 border border-gray-200 rounded-lg min-h-[40px] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(i);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </span>
        ))}
        {tags.length < max && (
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={addTag}
            placeholder={tags.length === 0 ? "タグを追加（Enterで確定）" : ""}
            className="flex-1 min-w-[100px] text-sm border-0 outline-none bg-transparent placeholder-gray-300"
          />
        )}
      </div>
      <p className="mt-1 text-xs text-gray-400">
        {tags.length}/{max}
      </p>
    </div>
  );
}
