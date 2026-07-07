"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { ModelsEducationResponse } from "@/external/client/api/generated";

import { type ApiError, createEducation, deleteEducation, updateEducation } from "./api";
import { DashedButton } from "./DashedButton";
import { CapIcon, PencilIcon, PlusIcon, TrashIcon } from "./Icons";
import { Field, PrimaryButton, SecondaryButton } from "./Modal";
import { useProfileColor } from "./ProfileColorContext";

type Props = {
  username: string;
  educations: ModelsEducationResponse[];
  isOwner?: boolean;
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1969 }, (_, i) => currentYear - i);

const selectClass =
  "w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[position:right_6px_center] bg-no-repeat";

export function EducationCard({ username, educations, isOwner = true }: Props) {
  const router = useRouter();
  const pc = useProfileColor();
  const [formState, setFormState] = useState<
    { mode: "closed" } | { mode: "create" } | { mode: "edit"; education: ModelsEducationResponse }
  >({ mode: "closed" });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleDelete = (id: string) => {
    if (!confirm("この学歴を削除しますか?")) return;
    setDeletingId(id);
    setDeleteError(null);
    startTransition(async () => {
      try {
        await deleteEducation(username, id);
        router.refresh();
      } catch (e) {
        setDeleteError((e as ApiError).message);
      } finally {
        setDeletingId(null);
      }
    });
  };

  const editingId = formState.mode === "edit" ? formState.education.id : null;

  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white px-4 md:px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <CapIcon className="h-6 w-6 text-gray-900" />
          学歴
        </h2>
        {isOwner && formState.mode === "closed" && (
          <button
            type="button"
            aria-label="学歴を追加"
            onClick={() => setFormState({ mode: "create" })}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm transition hover:opacity-80"
            style={{ backgroundColor: pc }}
          >
            <PlusIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      {isOwner && formState.mode === "create" && (
        <EducationForm
          username={username}
          mode="create"
          education={null}
          onClose={() => setFormState({ mode: "closed" })}
        />
      )}

      {educations.length === 0 && formState.mode === "closed" ? (
        isOwner ? (
          <DashedButton color={pc} onClick={() => setFormState({ mode: "create" })}>
            + 学歴を追加しましょう。
          </DashedButton>
        ) : null
      ) : (
        <ul className="mt-2 divide-y divide-gray-100">
          {educations.map((e) => (
            <li key={e.id} className="py-4 first:pt-2">
              {editingId === e.id ? (
                <EducationForm
                  username={username}
                  mode="edit"
                  education={e}
                  onClose={() => setFormState({ mode: "closed" })}
                />
              ) : (
                <div className="flex items-start gap-3">
                  <SchoolBadge name={e.school} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 text-lg font-bold tracking-tight text-gray-900">
                        {e.school}
                      </h3>
                      {isOwner && formState.mode === "closed" && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            aria-label="編集"
                            onClick={() => setFormState({ mode: "edit", education: e })}
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
                      )}
                    </div>
                    {e.degree ? <p className="mt-0.5 text-base text-gray-700">{e.degree}</p> : null}
                    <p className="mt-0.5 text-sm text-gray-500">
                      {formatYearsRange(e.startYear ?? null, e.endYear ?? null)}
                    </p>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {deleteError ? <p className="mt-3 text-sm text-rose-600">{deleteError}</p> : null}
    </section>
  );
}

type FormProps = {
  username: string;
  mode: "create" | "edit";
  education: ModelsEducationResponse | null;
  onClose: () => void;
};

function EducationForm({ username, mode, education, onClose }: FormProps) {
  const router = useRouter();
  const [school, setSchool] = useState(education?.school ?? "");
  const [degree, setDegree] = useState(education?.degree ?? "");
  const [startYear, setStartYear] = useState<number | null>(education?.startYear ?? null);
  const [endYear, setEndYear] = useState<number | null>(education?.endYear ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    const body = {
      school: school.trim(),
      degree: degree.trim() === "" ? null : degree.trim(),
      startYear: startYear,
      endYear: endYear,
    };
    if (body.school === "") {
      setError("学校名を入力してください");
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
    <div className="mt-4">
      <Field label="学校名" required>
        <input
          type="text"
          value={school}
          onChange={(e) => setSchool(e.target.value)}
          maxLength={200}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
        />
      </Field>
      <Field label="学部・学科・学位" hint="例: 工学部情報工学科 / B.Eng">
        <input
          type="text"
          value={degree}
          onChange={(e) => setDegree(e.target.value)}
          maxLength={200}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
        />
      </Field>
      <div className="flex flex-col md:flex-row md:flex-wrap gap-4">
        <div className="md:flex-1 md:min-w-[140px]">
          <Field label="入学年">
            <select
              value={startYear ?? ""}
              onChange={(e) => setStartYear(e.target.value ? Number(e.target.value) : null)}
              className={selectClass}
            >
              <option value="">年</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="md:flex-1 md:min-w-[140px]">
          <Field label="卒業年">
            <select
              value={endYear ?? ""}
              onChange={(e) => setEndYear(e.target.value ? Number(e.target.value) : null)}
              className={selectClass}
            >
              <option value="">年</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <div className="mt-4 flex justify-end gap-2">
        <SecondaryButton onClick={onClose}>キャンセル</SecondaryButton>
        <PrimaryButton loading={pending} onClick={handleSave}>
          保存
        </PrimaryButton>
      </div>
    </div>
  );
}

function SchoolBadge({ name }: { name: string }) {
  const pc = useProfileColor();
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-xl font-bold"
      style={{ backgroundColor: `${pc}18`, color: pc }}
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
