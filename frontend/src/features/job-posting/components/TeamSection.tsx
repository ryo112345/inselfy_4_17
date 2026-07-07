"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  CI_FULL_LABELS,
  CI_ORDER,
  SingleRadarChart,
  WV_FULL_LABELS,
  WV_ORDER,
} from "@/app/components/SingleRadarChart";
import { ACCENT } from "@/constants/theme";
import { uploadTeamMemberPhoto } from "../api";
import type { JobFormValues, SetJobFormField, TeamMember } from "../useJobForm";
import { InlineTextarea } from "./inline-inputs";
import { cardClass } from "./JobPostingForm";

export type TeamListItem = {
  id: string;
  name: string;
  memberCount: number;
  wvCompleted: number;
  ciCompleted: number;
};

export type TeamScores = {
  wvScores: { id: string; score: number }[] | null;
  ciScores: { id: string; score: number }[] | null;
};

const AVATAR_COLORS = [
  { bg: "#EAF4F0", fg: ACCENT },
  { bg: "#EEF2FB", fg: "#3B6FCC" },
  { bg: "#FEF7E6", fg: "#B07914" },
  { bg: "#F3EEFB", fg: "#7647C5" },
  { bg: "#FEE", fg: "#C54747" },
];

function memberNameClass(name: string) {
  return !name
    ? "text-2xl"
    : name.length >= 5
      ? "text-xs"
      : name.length === 4
        ? "text-sm"
        : name.length === 3
          ? "text-base"
          : name.length === 2
            ? "text-xl"
            : "text-2xl";
}

function MemberPhotoInput({ onUpload }: { onUpload: (url: string) => void }) {
  return (
    <input
      type="file"
      accept="image/*"
      className="hidden"
      onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          const url = await uploadTeamMemberPhoto(file);
          onUpload(url);
        } catch {
          // upload failed
        }
        e.target.value = "";
      }}
    />
  );
}

function MemberInput({
  teamMembers,
  onAdd,
}: {
  teamMembers: TeamMember[];
  onAdd: (member: TeamMember) => void;
}) {
  const [memberInput, setMemberInput] = useState("");
  if (teamMembers.length >= 5) return null;
  return (
    <input
      type="text"
      value={memberInput}
      onChange={(e) => setMemberInput(e.target.value)}
      placeholder="+ メンバー追加"
      className="text-sm outline-none bg-transparent text-gray-400 placeholder:text-gray-300 min-w-[100px] py-1"
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing && memberInput.trim()) {
          e.preventDefault();
          onAdd({ name: memberInput.trim() });
          setMemberInput("");
        }
      }}
    />
  );
}

function MemberChips({ values, set }: { values: JobFormValues; set: SetJobFormField }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {values.teamMembers.map((m, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700"
        >
          {m.name}
          <button
            type="button"
            onClick={() =>
              set(
                "teamMembers",
                values.teamMembers.filter((_, idx) => idx !== i),
              )
            }
            className="hover:text-red-500 cursor-pointer ml-0.5"
          >
            <svg
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <MemberInput
        teamMembers={values.teamMembers}
        onAdd={(member) => set("teamMembers", [...values.teamMembers, member])}
      />
    </div>
  );
}

function TeamLabelInput({ values, set }: { values: JobFormValues; set: SetJobFormField }) {
  return (
    <input
      type="text"
      value={values.teamLabel}
      onChange={(e) => set("teamLabel", e.target.value)}
      placeholder="例: 少数精鋭の営業チーム"
      className="w-52 text-center text-base font-semibold bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-brand transition-colors placeholder:text-gray-300"
      style={{ color: ACCENT }}
    />
  );
}

function TeamDescriptionPane({ values, set }: { values: JobFormValues; set: SetJobFormField }) {
  return (
    <div className="px-6 py-6 sm:px-7 sm:py-7 flex flex-col">
      <h2 className="text-lg font-bold text-gray-900">チーム紹介</h2>
      <div className="mt-3 flex-1 flex">
        <InlineTextarea
          value={values.teamDescription}
          onChange={(v) => set("teamDescription", v)}
          placeholder="チームの雰囲気やメンバー構成を記入..."
          className="text-[15px] leading-relaxed text-gray-700 flex-1"
        />
      </div>
    </div>
  );
}

/** 新規作成ページのチームセクション（チーム選択なし・アバター1列） */
export function SimpleTeamSection({
  values,
  set,
}: {
  values: JobFormValues;
  set: SetJobFormField;
}) {
  return (
    <section className={`overflow-hidden ${cardClass}`}>
      <div className="grid grid-cols-1 sm:grid-cols-[360px_1fr]">
        <div
          className="flex flex-col items-center justify-center gap-4 px-6 py-8 sm:py-10"
          style={{ background: `linear-gradient(135deg, ${ACCENT}14 0%, ${ACCENT}06 100%)` }}
        >
          {values.teamMembers.length > 0 && (
            <div className="flex items-center -space-x-[18px] pb-1">
              {values.teamMembers.map((m, i) => {
                const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                return (
                  <label key={i} className="relative cursor-pointer group">
                    <div
                      className="relative flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-white text-2xl font-bold shadow-sm overflow-hidden"
                      style={{ backgroundColor: color.bg, color: color.fg }}
                    >
                      {m.photoUrl ? (
                        <Image
                          src={m.photoUrl}
                          alt={m.name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        <span className={memberNameClass(m.name)}>{m.name.slice(0, 5)}</span>
                      )}
                    </div>
                    {!m.photoUrl && (
                      <span className="absolute bottom-0 left-0 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-400 group-hover:text-blue-500 group-hover:border-blue-300 transition-colors">
                        <svg
                          className="h-3 w-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </span>
                    )}
                    {m.photoUrl && (
                      <span className="absolute bottom-0 left-0 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg
                          className="h-3 w-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        </svg>
                      </span>
                    )}
                    <MemberPhotoInput
                      onUpload={(url) =>
                        set("teamMembers", (prev) =>
                          prev.map((member, idx) =>
                            idx === i ? { ...member, photoUrl: url } : member,
                          ),
                        )
                      }
                    />
                  </label>
                );
              })}
            </div>
          )}
          <TeamLabelInput values={values} set={set} />
        </div>
        <TeamDescriptionPane values={values} set={set} />
      </div>
      <div className="border-t border-gray-200 px-6 py-4">
        <h4 className="text-sm font-medium text-gray-500 mb-2">メンバー</h4>
        <MemberChips values={values} set={set} />
      </div>
    </section>
  );
}

/** 編集ページのチームセクション（チーム選択・診断チャート・多段アバター） */
export function TeamSectionWithSelector({
  values,
  set,
  teamId,
  onTeamIdChange,
  teamsList,
  teamScores,
}: {
  values: JobFormValues;
  set: SetJobFormField;
  teamId: string | null;
  onTeamIdChange: (teamId: string | null) => void;
  teamsList: TeamListItem[];
  teamScores: TeamScores | null;
}) {
  return (
    <section className={`overflow-hidden ${cardClass}`}>
      {/* Team selector + Members */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="shrink-0">
            <h4 className="text-sm font-medium text-gray-500 mb-1.5">チームを選択</h4>
            <select
              value={teamId ?? ""}
              onChange={(e) => onTeamIdChange(e.target.value || null)}
              className="w-56 truncate rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors cursor-pointer"
            >
              <option value="">選択してください</option>
              {teamsList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}（{t.memberCount}名）
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-medium text-gray-500 mb-1.5">メンバー</h4>
            <MemberChips values={values} set={set} />
          </div>
        </div>
        {teamsList.length === 0 && (
          <p className="mt-2 text-xs text-gray-400">
            チームが未作成です。
            <Link href="/company/teams" className="text-brand hover:underline ml-1">
              チーム管理
            </Link>
            で作成してください。
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[360px_1fr]">
        <div
          className="flex flex-col items-center justify-center gap-4 px-6 py-8 sm:py-10"
          style={{ background: `linear-gradient(135deg, ${ACCENT}14 0%, ${ACCENT}06 100%)` }}
        >
          <div className="flex flex-col -space-y-10">
            {(() => {
              const items =
                values.teamMembers.length > 0 ? values.teamMembers : [{ name: "" } as TeamMember];
              const rows: (typeof items)[] = [];
              for (let r = 0; r < items.length; r += 5) rows.push(items.slice(r, r + 5));
              return rows.map((row, rowIdx) => (
                <div
                  key={rowIdx}
                  className="flex items-center -space-x-[18px]"
                  style={{ paddingLeft: rowIdx % 2 === 1 ? "1.75rem" : 0 }}
                >
                  {row.map((m, colIdx) => {
                    const i = rowIdx * 5 + colIdx;
                    const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                    const isReal = values.teamMembers.length > 0;
                    return (
                      <label key={i} className={`relative ${isReal ? "cursor-pointer group" : ""}`}>
                        <div
                          className="relative flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-white text-2xl font-bold shadow-sm overflow-hidden"
                          style={{ backgroundColor: color.bg, color: color.fg }}
                        >
                          {m.photoUrl ? (
                            <Image
                              src={m.photoUrl}
                              alt={m.name}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          ) : (
                            <span className={memberNameClass(m.name)}>
                              {m.name ? m.name.slice(0, 5) : "?"}
                            </span>
                          )}
                        </div>
                        {isReal && !m.photoUrl && (
                          <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-400 group-hover:text-blue-500 group-hover:border-blue-300 transition-colors">
                            <svg
                              className="h-3 w-3"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <path d="M12 5v14M5 12h14" />
                            </svg>
                          </span>
                        )}
                        {isReal && m.photoUrl && (
                          <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg
                              className="h-3 w-3"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            </svg>
                          </span>
                        )}
                        {isReal && (
                          <MemberPhotoInput
                            onUpload={(url) =>
                              set("teamMembers", (prev) =>
                                prev.map((member, idx) =>
                                  idx === i ? { ...member, photoUrl: url } : member,
                                ),
                              )
                            }
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              ));
            })()}
          </div>
          <TeamLabelInput values={values} set={set} />
        </div>
        <TeamDescriptionPane values={values} set={set} />
      </div>

      {/* Team diagnostic results */}
      {teamId && (
        <div className="border-t border-gray-200 px-6 py-5">
          <h4 className="text-sm font-medium text-gray-500 mb-3">チーム診断結果</h4>
          {teamScores && (teamScores.wvScores || teamScores.ciScores) ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex flex-col items-center">
                <h5 className="text-sm font-medium text-gray-500 mb-1">Work Values</h5>
                {teamScores.wvScores ? (
                  <SingleRadarChart
                    scores={teamScores.wvScores}
                    order={WV_ORDER}
                    fullLabels={WV_FULL_LABELS}
                    isWV={true}
                  />
                ) : (
                  <div className="py-10 text-sm text-gray-400">データ準備中</div>
                )}
              </div>
              <div className="flex flex-col items-center">
                <h5 className="text-sm font-medium text-gray-500 mb-1">Career Interest</h5>
                {teamScores.ciScores ? (
                  <SingleRadarChart
                    scores={teamScores.ciScores}
                    order={CI_ORDER}
                    fullLabels={CI_FULL_LABELS}
                    isWV={false}
                  />
                ) : (
                  <div className="py-10 text-sm text-gray-400">データ準備中</div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-gray-400">
              診断データがまだありません。チームメンバーが診断を完了すると表示されます。
            </div>
          )}
        </div>
      )}
    </section>
  );
}
