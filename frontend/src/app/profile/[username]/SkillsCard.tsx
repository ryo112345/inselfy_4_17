"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { ModelsSkillResponse } from "@/external/client/api/generated";

import { attachSkill, detachSkill, type ApiError } from "./api";
import { AwardIcon, XIcon } from "./Icons";
import { useProfileColor } from "./ProfileColorContext";

type Props = {
  username: string;
  skills: ModelsSkillResponse[];
};

export function SkillsCard({ username, skills }: Props) {
  const router = useRouter();
  const pc = useProfileColor();
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [removing, setRemoving] = useState<string | null>(null);

  const handleAdd = () => {
    const name = input.trim();
    if (!name) return;
    setError(null);
    startTransition(async () => {
      try {
        await attachSkill(username, name);
        setInput("");
        router.refresh();
      } catch (e) {
        setError((e as ApiError).message);
      }
    });
  };

  const handleRemove = (name: string) => {
    setRemoving(name);
    setError(null);
    startTransition(async () => {
      try {
        await detachSkill(username, name);
        router.refresh();
      } catch (e) {
        setError((e as ApiError).message);
      } finally {
        setRemoving(null);
      }
    });
  };

  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <AwardIcon className="h-6 w-6 text-gray-900" />
          スキル
        </h2>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="スキルを入力"
            maxLength={100}
            className="h-10 w-44 rounded-full border border-gray-200 bg-white px-4 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
            style={{ "--tw-ring-color": pc } as React.CSSProperties}
          />
          <button
            type="button"
            disabled={pending || input.trim() === ""}
            onClick={handleAdd}
            className="inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{ backgroundColor: pc }}
          >
            追加
          </button>
        </div>
      </div>

      {skills.length === 0 ? (
        <p className="mt-4 text-lg leading-relaxed text-gray-500">
          スキルを追加して、あなたの強みをアピールしましょう。
        </p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {skills.map((s) => (
            <li
              key={s.id}
              className="group inline-flex items-center gap-1.5 rounded-full border py-2 pl-4 pr-2.5 text-base font-medium"
              style={{ borderColor: `${pc}40`, backgroundColor: `${pc}12`, color: pc }}
            >
              <span>{s.name}</span>
              <button
                type="button"
                aria-label={`${s.name} を削除`}
                disabled={pending && removing === s.name}
                onClick={() => handleRemove(s.name)}
                className="flex h-5 w-5 items-center justify-center rounded-full transition disabled:opacity-50"
                style={{ color: pc }}
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </section>
  );
}
