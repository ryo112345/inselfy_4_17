"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { ModelsUserResponse } from "@/external/client/api/generated";

import { updateProfile, type ApiError } from "./api";
import { PencilIcon } from "./Icons";
import { Field, PrimaryButton, SecondaryButton } from "./Modal";
import { useProfileColor } from "./ProfileColorContext";

type Props = {
  user: ModelsUserResponse;
  isOwner?: boolean;
};

export function AboutCard({ user, isOwner = true }: Props) {
  const router = useRouter();
  const pc = useProfileColor();
  const [isEditing, setIsEditing] = useState(false);
  const [about, setAbout] = useState(user.about ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    const trimmed = about.trim();
    const value = trimmed === "" ? null : trimmed;
    startTransition(async () => {
      try {
        await updateProfile(user.username, { about: value });
        router.refresh();
        setIsEditing(false);
      } catch (e) {
        setError((e as ApiError).message);
      }
    });
  };

  const handleCancel = () => {
    setAbout(user.about ?? "");
    setError(null);
    setIsEditing(false);
  };

  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">自己紹介</h2>
        {isOwner && !isEditing && (
          <button
            type="button"
            aria-label="自己紹介を編集"
            onClick={() => setIsEditing(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white transition hover:opacity-80"
            style={{ borderColor: pc, color: pc }}
          >
            <PencilIcon className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="mt-4">
          <Field label="自己紹介" hint={`${about.length} / 2000`}>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              maxLength={2000}
              rows={10}
              placeholder="これまでの経歴、強み、興味のある領域などを自由に記述してください。"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed text-gray-900 focus:border-emerald-600 focus:outline-none"
            />
          </Field>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="mt-4 flex justify-end gap-2">
            <SecondaryButton onClick={handleCancel}>キャンセル</SecondaryButton>
            <PrimaryButton loading={pending} onClick={handleSave}>
              保存
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <>
          {user.about ? (
            <p className="mt-3 whitespace-pre-wrap text-lg leading-relaxed text-gray-800">
              {user.about}
            </p>
          ) : isOwner ? (
            <p className="mt-3 text-lg leading-relaxed text-gray-500">
              自己紹介を追加して、あなたのことを教えてください。
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
