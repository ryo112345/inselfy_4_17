"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { ModelsEducationResponse } from "@/external/client/api/generated";

import {
  createEducation,
  deleteEducation,
  updateEducation,
  type ApiError,
} from "./api";
import { CapIcon, PencilIcon, PlusIcon, TrashIcon } from "./Icons";
import { Field, Modal, PrimaryButton, SecondaryButton } from "./Modal";

type Props = {
  username: string;
  educations: ModelsEducationResponse[];
};

export function EducationCard({ username, educations }: Props) {
  const router = useRouter();
  const [dialogState, setDialogState] = useState<
    | { mode: "closed" }
    | { mode: "create" }
    | { mode: "edit"; education: ModelsEducationResponse }
  >({ mode: "closed" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    if (!confirm("この学歴を削除しますか?")) return;
    setDeletingId(id);
    setError(null);
    startTransition(async () => {
      try {
        await deleteEducation(username, id);
        router.refresh();
      } catch (e) {
        setError((e as ApiError).message);
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <CapIcon className="h-6 w-6 text-gray-900" />
          学歴
        </h2>
        <button
          type="button"
          aria-label="学歴を追加"
          onClick={() => setDialogState({ mode: "create" })}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm transition hover:bg-emerald-800"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>

      {educations.length === 0 ? (
        <button
          type="button"
          onClick={() => setDialogState({ mode: "create" })}
          className="mt-4 block w-full rounded-xl border-2 border-dashed border-[#d6d9de] bg-white bg-clip-padding py-5 text-center text-lg font-semibold leading-relaxed text-emerald-700 transition hover:border-emerald-700 hover:bg-emerald-50"
        >
          + 学歴を追加しましょう。
        </button>
      ) : (
        <ul className="mt-2 divide-y divide-gray-100">
          {educations.map((e) => (
            <li key={e.id} className="group flex items-start gap-3 py-4 first:pt-2">
              <SchoolBadge name={e.school} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold tracking-tight text-gray-900">
                      {e.school}
                    </h3>
                    {e.degree ? (
                      <p className="mt-0.5 text-base text-gray-700">{e.degree}</p>
                    ) : null}
                    <p className="mt-0.5 text-sm text-gray-500">
                      {formatYearsRange(e.startYear ?? null, e.endYear ?? null)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      aria-label="編集"
                      onClick={() => setDialogState({ mode: "edit", education: e })}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-emerald-600 hover:text-emerald-700"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="削除"
                      disabled={pending && deletingId === e.id}
                      onClick={() => handleDelete(e.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-rose-500 hover:text-rose-600 disabled:opacity-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

      {dialogState.mode !== "closed" ? (
        <EducationDialog
          username={username}
          mode={dialogState.mode}
          education={dialogState.mode === "edit" ? dialogState.education : null}
          onClose={() => setDialogState({ mode: "closed" })}
        />
      ) : null}
    </section>
  );
}

type DialogProps = {
  username: string;
  mode: "create" | "edit";
  education: ModelsEducationResponse | null;
  onClose: () => void;
};

function EducationDialog({ username, mode, education, onClose }: DialogProps) {
  const router = useRouter();
  const [school, setSchool] = useState(education?.school ?? "");
  const [degree, setDegree] = useState(education?.degree ?? "");
  const [startYear, setStartYear] = useState(
    education?.startYear != null ? String(education.startYear) : "",
  );
  const [endYear, setEndYear] = useState(
    education?.endYear != null ? String(education.endYear) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    const body = {
      school: school.trim(),
      degree: degree.trim() === "" ? null : degree.trim(),
      startYear: startYear === "" ? null : Number(startYear),
      endYear: endYear === "" ? null : Number(endYear),
    };
    if (body.school === "") {
      setError("学校名を入力してください");
      return;
    }
    if (body.startYear != null && Number.isNaN(body.startYear)) {
      setError("入学年は数値で入力してください");
      return;
    }
    if (body.endYear != null && Number.isNaN(body.endYear)) {
      setError("卒業年は数値で入力してください");
      return;
    }

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createEducation(username, body);
        } else if (education) {
          await updateEducation(username, education.id, body);
        }
        router.refresh();
        onClose();
      } catch (e) {
        setError((e as ApiError).message);
      }
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={mode === "create" ? "学歴を追加" : "学歴を編集"}
      footer={
        <>
          <SecondaryButton onClick={onClose}>キャンセル</SecondaryButton>
          <PrimaryButton loading={pending} onClick={handleSave}>
            保存
          </PrimaryButton>
        </>
      }
    >
      <Field label="学校名" required>
        <input
          type="text"
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          maxLength={200}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
        />
      </Field>
      <Field label="学部・学科・学位" hint="例: 工学部情報工学科 / B.Eng">
        <input
          type="text"
          value={degree}
          onChange={(e) => setDegree(e.target.value)}
          maxLength={200}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
        />
      </Field>
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[140px]">
          <Field label="入学年">
            <input
              type="number"
              value={startYear}
              min={1950}
              max={2100}
              onChange={(e) => setStartYear(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
            />
          </Field>
        </div>
        <div className="flex-1 min-w-[140px]">
          <Field label="卒業年">
            <input
              type="number"
              value={endYear}
              min={1950}
              max={2100}
              onChange={(e) => setEndYear(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
            />
          </Field>
        </div>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </Modal>
  );
}

function SchoolBadge({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 text-xl font-bold text-emerald-800"
    >
      {initial}
    </span>
  );
}

function formatYearsRange(start: number | null, end: number | null): string {
  if (start == null && end == null) return "";
  if (start != null && end != null) return `${start}年 〜 ${end}年`;
  if (start != null) return `${start}年 〜`;
  return `〜 ${end}年`;
}
