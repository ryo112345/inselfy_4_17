"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { ModelsExperienceResponse } from "@/external/client/api/generated";

import {
  createExperience,
  deleteExperience,
  updateExperience,
  type ApiError,
} from "./api";
import { BriefcaseIcon, PencilIcon, PlusIcon, TrashIcon } from "./Icons";
import { Field, PrimaryButton, SecondaryButton } from "./Modal";
import { DashedButton } from "./DashedButton";
import { useProfileColor } from "./ProfileColorContext";

type Props = {
  username: string;
  experiences: ModelsExperienceResponse[];
  isOwner?: boolean;
};

export function ExperienceCard({ username, experiences, isOwner = true }: Props) {
  const pc = useProfileColor();
  const [formState, setFormState] = useState<
    | { mode: "closed" }
    | { mode: "create" }
    | { mode: "edit"; experience: ModelsExperienceResponse }
  >({ mode: "closed" });
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const groups = useMemo(() => {
    const sorted = [...experiences].sort((a, b) => {
      const aKey = a.isCurrent
        ? Number.MAX_SAFE_INTEGER
        : (a.endYear ?? a.startYear) * 12 + (a.endMonth ?? a.startMonth);
      const bKey = b.isCurrent
        ? Number.MAX_SAFE_INTEGER
        : (b.endYear ?? b.startYear) * 12 + (b.endMonth ?? b.startMonth);
      if (aKey !== bKey) return bKey - aKey;
      return b.startYear * 12 + b.startMonth - (a.startYear * 12 + a.startMonth);
    });
    return groupConsecutive(sorted);
  }, [experiences]);

  const handleDelete = (id: string) => {
    if (!confirm("この職歴を削除しますか?")) return;
    setDeletingId(id);
    setDeleteError(null);
    startTransition(async () => {
      try {
        await deleteExperience(username, id);
        router.refresh();
      } catch (e) {
        setDeleteError((e as ApiError).message);
      } finally {
        setDeletingId(null);
      }
    });
  };

  return (
    <section className="rounded-2xl border border-gray-200/80 bg-white px-6 py-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <BriefcaseIcon className="h-6 w-6 text-gray-900" />
          職歴
        </h2>
        {isOwner && formState.mode === "closed" && (
          <button
            type="button"
            aria-label="職歴を追加"
            onClick={() => setFormState({ mode: "create" })}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm transition hover:opacity-80"
            style={{ backgroundColor: pc }}
          >
            <PlusIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      {isOwner && formState.mode === "create" && (
        <ExperienceForm
          username={username}
          mode="create"
          experience={null}
          onClose={() => setFormState({ mode: "closed" })}
        />
      )}

      {experiences.length === 0 && formState.mode === "closed" ? (
        isOwner ? (
          <DashedButton color={pc} onClick={() => setFormState({ mode: "create" })}>
            + 職歴を追加して、キャリアをアピールしましょう。
          </DashedButton>
        ) : null
      ) : (
        <ul className="mt-2">
          {groups.map((group, idx) => {
            const isLast = idx === groups.length - 1;
            const editingId = formState.mode === "edit" ? formState.experience.id : null;
            return (
              <li
                key={group.items[0].id}
                className="relative pt-4 pb-3"
              >
                <TimelineRail isLast={isLast} />
                {group.items.length === 1 ? (
                  editingId === group.items[0].id ? (
                    <ExperienceForm
                      username={username}
                      mode="edit"
                      experience={group.items[0]}
                      onClose={() => setFormState({ mode: "closed" })}
                    />
                  ) : (
                    <SingleExperience
                      experience={group.items[0]}
                      pending={pending && deletingId === group.items[0].id}
                      showActions={isOwner && formState.mode === "closed"}
                      onEdit={() =>
                        setFormState({ mode: "edit", experience: group.items[0] })
                      }
                      onDelete={() => handleDelete(group.items[0].id)}
                    />
                  )
                ) : (
                  <GroupedExperience
                    group={group}
                    editingId={editingId}
                    deletingId={deletingId}
                    pending={pending}
                    showActions={isOwner && formState.mode === "closed"}
                    onEdit={(e) =>
                      setFormState({ mode: "edit", experience: e })
                    }
                    onDelete={handleDelete}
                    username={username}
                    onCloseEdit={() => setFormState({ mode: "closed" })}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {deleteError ? <p className="mt-3 text-sm text-rose-600">{deleteError}</p> : null}
    </section>
  );
}

type ExpGroup = {
  companyName: string;
  items: ModelsExperienceResponse[];
};

function groupConsecutive(items: ModelsExperienceResponse[]): ExpGroup[] {
  const groups: ExpGroup[] = [];
  for (const it of items) {
    const last = groups[groups.length - 1];
    if (last && last.companyName === it.companyName) {
      last.items.push(it);
    } else {
      groups.push({ companyName: it.companyName, items: [it] });
    }
  }
  return groups;
}

function TimelineRail({ isLast = false }: { isLast?: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-[24px] top-[64px] w-[2px] -translate-x-1/2"
      style={{ bottom: isLast ? "0px" : "-28px" }}
    >
      <svg
        preserveAspectRatio="none"
        viewBox="0 0 2 100"
        className="block h-full w-full"
      >
        <line
          x1="1"
          y1="0"
          x2="1"
          y2="100"
          stroke="#d6d9de"
          strokeWidth={2}
          strokeDasharray="5 6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function RoleRail({ isLast = false }: { isLast?: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-[5px] top-[17px] w-[2px] -translate-x-1/2"
      style={{ bottom: isLast ? "0px" : "-20px" }}
    >
      <svg
        preserveAspectRatio="none"
        viewBox="0 0 2 100"
        className="block h-full w-full"
      >
        <line
          x1="1"
          y1="0"
          x2="1"
          y2="100"
          stroke="#d6d9de"
          strokeWidth={2}
          strokeDasharray="5 6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

function RoleDot() {
  const pc = useProfileColor();
  return (
    <span
      aria-hidden
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: pc }}
    />
  );
}

function CurrentBadge() {
  const pc = useProfileColor();
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: pc }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: pc }} />
      現職
    </span>
  );
}

function CompanyBadge({ name }: { name: string }) {
  const pc = useProfileColor();
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className="relative z-10 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white text-xl font-bold"
      style={{ color: pc, border: `1px solid ${pc}40` }}
    >
      {initial}
    </span>
  );
}

function RowActions({
  onEdit,
  onDelete,
  disabled,
}: {
  onEdit: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
      <button
        type="button"
        aria-label="編集"
        onClick={onEdit}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-emerald-600 hover:text-emerald-700"
      >
        <PencilIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="削除"
        disabled={disabled}
        onClick={onDelete}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-rose-500 hover:text-rose-600 disabled:opacity-50"
      >
        <TrashIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function PeriodLine({ experience }: { experience: ModelsExperienceResponse }) {
  const e = experience;
  const period = formatPeriod(
    e.startYear,
    e.startMonth,
    e.endYear ?? null,
    e.endMonth ?? null,
    e.isCurrent,
  );
  const duration = formatDuration(
    e.startYear,
    e.startMonth,
    e.endYear ?? null,
    e.endMonth ?? null,
    e.isCurrent,
  );
  return (
    <p className="mt-0.5 pl-5 text-sm text-gray-500">
      {period}
      {duration ? ` · ${duration}` : ""}
    </p>
  );
}

function SingleExperience({
  experience,
  pending,
  showActions,
  onEdit,
  onDelete,
}: {
  experience: ModelsExperienceResponse;
  pending: boolean;
  showActions: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const e = experience;
  return (
    <div className="group flex items-start gap-3">
      <CompanyBadge name={e.companyName} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold tracking-tight text-gray-900">
              {e.companyName}
            </h3>
            <div className="relative mt-1">
              <RoleRail isLast />
              <p className="flex flex-wrap items-center gap-x-2 text-base font-medium text-gray-700">
                <RoleDot />
                <span>{e.title}</span>
                {e.isCurrent ? <CurrentBadge /> : null}
              </p>
              <PeriodLine experience={e} />
              {e.description ? (
                <p className="mt-2.5 whitespace-pre-wrap pl-5 text-base leading-relaxed text-gray-800">
                  {e.description}
                </p>
              ) : null}
            </div>
          </div>
          {showActions && (
            <RowActions onEdit={onEdit} onDelete={onDelete} disabled={pending} />
          )}
        </div>
      </div>
    </div>
  );
}

function GroupedExperience({
  group,
  editingId,
  deletingId,
  pending,
  showActions,
  onEdit,
  onDelete,
  username,
  onCloseEdit,
}: {
  group: ExpGroup;
  editingId: string | null;
  deletingId: string | null;
  pending: boolean;
  showActions: boolean;
  onEdit: (e: ModelsExperienceResponse) => void;
  onDelete: (id: string) => void;
  username: string;
  onCloseEdit: () => void;
}) {
  const earliest = group.items.reduce(
    (acc, it) => {
      const k = it.startYear * 12 + it.startMonth;
      return k < acc.key ? { key: k, y: it.startYear, m: it.startMonth } : acc;
    },
    { key: Number.MAX_SAFE_INTEGER, y: 0, m: 0 },
  );
  const hasCurrent = group.items.some((it) => it.isCurrent);
  const latestEnd = hasCurrent
    ? { y: null as number | null, m: null as number | null }
    : group.items.reduce(
        (acc, it) => {
          const y = it.endYear ?? it.startYear;
          const m = it.endMonth ?? it.startMonth;
          const k = y * 12 + m;
          return k > acc.key ? { key: k, y, m } : acc;
        },
        { key: -Infinity, y: null as number | null, m: null as number | null },
      );

  return (
    <div className="flex items-start gap-3">
      <CompanyBadge name={group.companyName} />
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-bold tracking-tight text-gray-900">
          {group.companyName}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {formatPeriod(earliest.y, earliest.m, latestEnd.y, latestEnd.m, hasCurrent)}
          {(() => {
            const d = formatDuration(
              earliest.y,
              earliest.m,
              latestEnd.y,
              latestEnd.m,
              hasCurrent,
            );
            return d ? ` · ${d}` : "";
          })()}
        </p>
        <ul className="mt-4 space-y-5">
          {group.items.map((e, i) => {
            const isLastRole = i === group.items.length - 1;
            if (editingId === e.id) {
              return (
                <li key={e.id} className="relative">
                  <ExperienceForm
                    username={username}
                    mode="edit"
                    experience={e}
                    onClose={onCloseEdit}
                  />
                </li>
              );
            }
            return (
              <li key={e.id} className="group relative">
                <RoleRail isLast={isLastRole} />
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="flex flex-wrap items-center gap-x-2 text-base font-semibold text-gray-900">
                      <RoleDot />
                      <span>{e.title}</span>
                      {e.isCurrent ? <CurrentBadge /> : null}
                    </h4>
                    <PeriodLine experience={e} />
                  </div>
                  {showActions && (
                    <RowActions
                      onEdit={() => onEdit(e)}
                      onDelete={() => onDelete(e.id)}
                      disabled={pending && deletingId === e.id}
                    />
                  )}
                </div>
                {e.description ? (
                  <p className="mt-2 whitespace-pre-wrap pl-5 text-base leading-relaxed text-gray-800">
                    {e.description}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

type FormProps = {
  username: string;
  mode: "create" | "edit";
  experience: ModelsExperienceResponse | null;
  onClose: () => void;
};

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1969 }, (_, i) => currentYear - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const selectClass =
  "w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-8 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%236b7280%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[position:right_6px_center] bg-no-repeat";

function YearMonthSelect({
  year,
  month,
  onChangeYear,
  onChangeMonth,
  disabled,
}: {
  year: number | null;
  month: number | null;
  onChangeYear: (v: number | null) => void;
  onChangeMonth: (v: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-2">
      <select
        value={year ?? ""}
        disabled={disabled}
        onChange={(e) => onChangeYear(e.target.value ? Number(e.target.value) : null)}
        className={`${selectClass} disabled:bg-gray-100 disabled:text-gray-400`}
      >
        <option value="">年</option>
        {YEARS.map((y) => (
          <option key={y} value={y}>{y}年</option>
        ))}
      </select>
      <select
        value={month ?? ""}
        disabled={disabled}
        onChange={(e) => onChangeMonth(e.target.value ? Number(e.target.value) : null)}
        className={`${selectClass} disabled:bg-gray-100 disabled:text-gray-400`}
      >
        <option value="">月</option>
        {MONTHS.map((m) => (
          <option key={m} value={m}>{m}月</option>
        ))}
      </select>
    </div>
  );
}

function ExperienceForm({ username, mode, experience, onClose }: FormProps) {
  const router = useRouter();
  const [company, setCompany] = useState(experience?.companyName ?? "");
  const [title, setTitle] = useState(experience?.title ?? "");
  const [startYear, setStartYear] = useState<number | null>(experience?.startYear ?? null);
  const [startMonth, setStartMonth] = useState<number | null>(experience?.startMonth ?? null);
  const [endYear, setEndYear] = useState<number | null>(experience?.endYear ?? null);
  const [endMonth, setEndMonth] = useState<number | null>(experience?.endMonth ?? null);
  const [isCurrent, setIsCurrent] = useState(experience?.isCurrent ?? false);
  const [description, setDescription] = useState(experience?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    if (!startYear || !startMonth) {
      setError("開始年月を入力してください");
      return;
    }
    if (!isCurrent && (!endYear || !endMonth)) {
      setError("終了年月を入力してください (現職の場合はチェックを入れてください)");
      return;
    }
    const body = {
      companyName: company.trim(),
      title: title.trim(),
      startYear,
      startMonth,
      endYear: isCurrent ? null : endYear,
      endMonth: isCurrent ? null : endMonth,
      isCurrent,
      description: description.trim(),
    };

    startTransition(async () => {
      try {
        if (mode === "create") {
          await createExperience(username, body);
        } else if (experience) {
          await updateExperience(username, experience.id, body);
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
      <Field label="会社名" required>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          maxLength={200}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
        />
      </Field>
      <Field label="役職・タイトル" required>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
        />
      </Field>
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <Field label="開始年月" required>
            <YearMonthSelect
              year={startYear}
              month={startMonth}
              onChangeYear={setStartYear}
              onChangeMonth={setStartMonth}
            />
          </Field>
        </div>
        <div className="flex-1 min-w-[200px]">
          <Field label="終了年月">
            <YearMonthSelect
              year={endYear}
              month={endMonth}
              onChangeYear={setEndYear}
              onChangeMonth={setEndMonth}
              disabled={isCurrent}
            />
          </Field>
        </div>
      </div>
      <label className="mt-1 mb-4 ml-2 flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isCurrent}
          onChange={(e) => {
            setIsCurrent(e.target.checked);
            if (e.target.checked) {
              setEndYear(null);
              setEndMonth(null);
            }
          }}
          className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
        />
        現職として登録する
      </label>
      <Field
        label="業務内容"
        hint={`${description.length} / 5000`}
      >
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          rows={6}
          placeholder="役割、成果、使用した技術などを自由に記述してください。"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed text-gray-900 focus:border-emerald-600 focus:outline-none"
        />
      </Field>
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

function formatPeriod(
  startYear: number,
  startMonth: number,
  endYear: number | null,
  endMonth: number | null,
  isCurrent: boolean,
): string {
  const start = `${startYear}年${startMonth}月`;
  const end = isCurrent
    ? "現在"
    : endYear != null && endMonth != null
      ? `${endYear}年${endMonth}月`
      : "";
  return end ? `${start} 〜 ${end}` : start;
}

function formatDuration(
  startYear: number,
  startMonth: number,
  endYear: number | null,
  endMonth: number | null,
  isCurrent: boolean,
): string {
  const now = new Date();
  const ey = isCurrent ? now.getFullYear() : endYear;
  const em = isCurrent ? now.getMonth() + 1 : endMonth;
  if (ey == null || em == null) return "";
  const months = (ey - startYear) * 12 + (em - startMonth) + 1;
  if (months <= 0) return "";
  if (months < 12) return `${months}ヶ月`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years}年${rem}ヶ月` : `${years}年`;
}

