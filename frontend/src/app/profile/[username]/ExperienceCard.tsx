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
import { Field, Modal, PrimaryButton, SecondaryButton } from "./Modal";

type Props = {
  username: string;
  experiences: ModelsExperienceResponse[];
};

export function ExperienceCard({ username, experiences }: Props) {
  const [dialogState, setDialogState] = useState<
    | { mode: "closed" }
    | { mode: "create" }
    | { mode: "edit"; experience: ModelsExperienceResponse }
  >({ mode: "closed" });
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
    setError(null);
    startTransition(async () => {
      try {
        await deleteExperience(username, id);
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
          <BriefcaseIcon className="h-6 w-6 text-gray-900" />
          職歴
        </h2>
        <button
          type="button"
          aria-label="職歴を追加"
          onClick={() => setDialogState({ mode: "create" })}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-white shadow-sm transition hover:bg-emerald-800"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>

      {experiences.length === 0 ? (
        <button
          type="button"
          onClick={() => setDialogState({ mode: "create" })}
          className="mt-4 block w-full rounded-xl border-2 border-dashed border-[#d6d9de] bg-white bg-clip-padding py-5 text-center text-lg font-semibold leading-relaxed text-emerald-700 transition hover:border-emerald-700 hover:bg-emerald-50"
        >
          + 職歴を追加して、キャリアをアピールしましょう。
        </button>
      ) : (
        <ul className="mt-2">
          {groups.map((group, idx) => {
            const isLast = idx === groups.length - 1;
            return (
              <li
                key={group.items[0].id}
                className="relative pt-4 pb-7 pl-6"
              >
                {!isLast ? <TimelineRail /> : null}
                {group.items.length === 1 ? (
                  <SingleExperience
                    experience={group.items[0]}
                    pending={pending && deletingId === group.items[0].id}
                    onEdit={() =>
                      setDialogState({ mode: "edit", experience: group.items[0] })
                    }
                    onDelete={() => handleDelete(group.items[0].id)}
                  />
                ) : (
                  <GroupedExperience
                    group={group}
                    deletingId={deletingId}
                    pending={pending}
                    onEdit={(e) =>
                      setDialogState({ mode: "edit", experience: e })
                    }
                    onDelete={handleDelete}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

      {dialogState.mode !== "closed" ? (
        <ExperienceDialog
          username={username}
          mode={dialogState.mode}
          experience={dialogState.mode === "edit" ? dialogState.experience : null}
          onClose={() => setDialogState({ mode: "closed" })}
        />
      ) : null}
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

// Dashed rail connecting the center-bottom of one company logo to the top of
// the next. Wraps the SVG in a div so the CSS top/bottom pair reliably sizes
// the container (some browsers don't auto-size bare <svg> elements via
// top+bottom). The div starts at y=64 (pt-4 + 48px logo) and ends at bottom:
// -44px so it spans pb-7 (28px) + pt-4 (16px) = the full 44px gap between
// this li and the next logo's top edge. Left:48 centers on the 48px-wide
// badge sitting inside the li's pl-6 padding.
function TimelineRail() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-[48px] top-[64px] w-[2px] -translate-x-1/2"
      style={{ bottom: "-44px" }}
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

// Dashed rail connecting the bottom of one role dot to the top of the next
// role dot within a grouped experience. Dot is 10px tall, inline-centered in
// a text-base h4 (24px line-height), so its bottom edge sits at y=17 and its
// top sits at y=7. Between consecutive role li's, space-y-5 adds 20px of
// margin-top. So bottom: -30px extends from y=17 in li_i past the 20px gap
// and a few px into the next dot (covered by the solid dot fill).
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

// Solid green dot placed to the left of every role title. Same 10px size as
// the legacy timeline-rail marker, repurposed as a per-role bullet.
function RoleDot() {
  return (
    <span
      aria-hidden
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-600"
    />
  );
}

// Small dot-and-label marker shown next to the job title whose isCurrent
// flag is true. Sits inline with the title so the viewer sees it on the role
// row rather than the company row.
function CurrentBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
      現職
    </span>
  );
}

// Inline company badge placed between the ・ and the company name. Uses the
// first character of the company name as a placeholder until real logo URLs
// exist in the data model.
function CompanyBadge({ name }: { name: string }) {
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
  onEdit,
  onDelete,
}: {
  experience: ModelsExperienceResponse;
  pending: boolean;
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
          <RowActions onEdit={onEdit} onDelete={onDelete} disabled={pending} />
        </div>
      </div>
    </div>
  );
}

function GroupedExperience({
  group,
  deletingId,
  pending,
  onEdit,
  onDelete,
}: {
  group: ExpGroup;
  deletingId: string | null;
  pending: boolean;
  onEdit: (e: ModelsExperienceResponse) => void;
  onDelete: (id: string) => void;
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
                  <RowActions
                    onEdit={() => onEdit(e)}
                    onDelete={() => onDelete(e.id)}
                    disabled={pending && deletingId === e.id}
                  />
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

type DialogProps = {
  username: string;
  mode: "create" | "edit";
  experience: ModelsExperienceResponse | null;
  onClose: () => void;
};

function ExperienceDialog({ username, mode, experience, onClose }: DialogProps) {
  const router = useRouter();
  const [company, setCompany] = useState(experience?.companyName ?? "");
  const [title, setTitle] = useState(experience?.title ?? "");
  const [startStr, setStartStr] = useState(
    experience ? formatYearMonth(experience.startYear, experience.startMonth) : "",
  );
  const [endStr, setEndStr] = useState(
    experience && experience.endYear != null && experience.endMonth != null
      ? formatYearMonth(experience.endYear, experience.endMonth)
      : "",
  );
  const [isCurrent, setIsCurrent] = useState(experience?.isCurrent ?? false);
  const [description, setDescription] = useState(experience?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    const startParsed = parseYearMonth(startStr);
    if (!startParsed) {
      setError("開始年月を入力してください");
      return;
    }
    if (!isCurrent) {
      const endParsed = parseYearMonth(endStr);
      if (!endParsed) {
        setError("終了年月を入力してください (現職の場合はチェックを入れてください)");
        return;
      }
    }
    const body = {
      companyName: company.trim(),
      title: title.trim(),
      startYear: startParsed.year,
      startMonth: startParsed.month,
      endYear: isCurrent ? null : parseYearMonth(endStr)?.year ?? null,
      endMonth: isCurrent ? null : parseYearMonth(endStr)?.month ?? null,
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
    <Modal
      open
      onClose={onClose}
      title={mode === "create" ? "職歴を追加" : "職歴を編集"}
      footer={
        <>
          <SecondaryButton onClick={onClose}>キャンセル</SecondaryButton>
          <PrimaryButton loading={pending} onClick={handleSave}>
            保存
          </PrimaryButton>
        </>
      }
    >
      <Field label="会社名" required>
        <input
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          maxLength={200}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
        />
      </Field>
      <Field label="役職・タイトル" required>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
        />
      </Field>
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[140px]">
          <Field label="開始年月" required>
            <input
              type="month"
              value={startStr}
              onChange={(e) => setStartStr(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none"
            />
          </Field>
        </div>
        <div className="flex-1 min-w-[140px]">
          <Field label="終了年月">
            <input
              type="month"
              value={endStr}
              disabled={isCurrent}
              onChange={(e) => setEndStr(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-emerald-600 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
            />
          </Field>
        </div>
      </div>
      <label className="mb-4 flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={isCurrent}
          onChange={(e) => {
            setIsCurrent(e.target.checked);
            if (e.target.checked) setEndStr("");
          }}
          className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
        />
        現職として登録する
      </label>
      <Field
        label="業務内容"
        hint={`自然な文章で記述してください (${description.length} / 5000)`}
      >
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          rows={6}
          placeholder="役割、成果、使用した技術などを自由に記述してください。"
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm leading-relaxed text-gray-900 focus:border-emerald-600 focus:outline-none"
        />
      </Field>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </Modal>
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

function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseYearMonth(
  s: string,
): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{1,2})$/.exec(s);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (Number.isNaN(year) || Number.isNaN(month)) return null;
  if (month < 1 || month > 12) return null;
  return { year, month };
}
