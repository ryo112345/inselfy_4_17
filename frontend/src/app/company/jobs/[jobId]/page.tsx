"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ErrorSummary } from "@/components/form/ErrorSummary";
import { useFieldErrors } from "@/components/form/useFieldErrors";
import { useConfirm, useToast } from "@/components/ui";
import {
  companyTeamsGetTeamScores,
  companyTeamsListTeams,
} from "@/external/client/api/orval/generated/endpoints/company-teams/company-teams";
import { deleteJobPosting, fetchJobPosting, updateJobPosting } from "@/features/job-posting/api";
import { JobPostingForm } from "@/features/job-posting/components/JobPostingForm";
import {
  type TeamListItem,
  type TeamScores,
  TeamSectionWithSelector,
} from "@/features/job-posting/components/TeamSection";
import { useCompanyProfile } from "@/features/job-posting/useCompanyProfile";
import {
  buildJobPostingBody,
  buildPreviewPayload,
  jobFormValuesFromApi,
  jobPostingBodySchema,
  jobPostingFieldLabels,
  makeSetWithClear,
  useJobForm,
} from "@/features/job-posting/useJobForm";
import { useJobPreviewChannel } from "@/features/job-posting/useJobPreviewChannel";
import { getErrorMessage } from "@/lib/api-result";

export default function JobEditPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;
  const confirmDialog = useConfirm();
  const { showToast } = useToast();
  const company = useCompanyProfile();
  const [isLoading, setIsLoading] = useState(true);
  const [savingAction, setSavingAction] = useState<"save" | "publish" | "unpublish" | null>(null);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const validationRef = useRef<HTMLDivElement>(null);

  const { values, set, setValues, missingRequired, requiredOk } = useJobForm();
  const { fieldErrors, validate, clearField, scrollToFirstError } = useFieldErrors();
  const setField = useMemo(() => makeSetWithClear(set, clearField), [set, clearField]);
  const [status, setStatus] = useState<"open" | "draft">("draft");
  const [teamId, setTeamId] = useState<string | null>(null);
  const [teamsList, setTeamsList] = useState<TeamListItem[]>([]);
  const [teamScores, setTeamScores] = useState<TeamScores | null>(null);

  useEffect(() => {
    fetchJobPosting(jobId)
      .then((d) => {
        setValues(jobFormValuesFromApi(d));
        setStatus(d.status === "open" ? "open" : "draft");
        setTeamId(d.teamId ?? null);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [jobId, setValues]);

  useEffect(() => {
    companyTeamsListTeams()
      .then((data) => setTeamsList(data.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!teamId) {
      setTeamScores(null);
      return;
    }
    companyTeamsGetTeamScores(teamId)
      .then((data) => {
        const wvAgg = new Map<string, number[]>();
        const ciAgg = new Map<string, number[]>();
        for (const m of data.items) {
          if (m.wvScores)
            for (const s of m.wvScores) {
              const vals = wvAgg.get(s.id) ?? [];
              vals.push(s.displayScore);
              wvAgg.set(s.id, vals);
            }
          if (m.ciScores)
            for (const s of m.ciScores) {
              const vals = ciAgg.get(s.id) ?? [];
              vals.push(s.displayScore);
              ciAgg.set(s.id, vals);
            }
        }
        const avg = (map: Map<string, number[]>) =>
          map.size > 0
            ? Array.from(map.entries()).map(([id, vals]) => ({
                id,
                score: vals.reduce((a, b) => a + b, 0) / vals.length,
              }))
            : null;
        setTeamScores({ wvScores: avg(wvAgg), ciScores: avg(ciAgg) });
      })
      .catch(() => setTeamScores(null));
  }, [teamId]);

  const previewPayload = useMemo(
    () =>
      buildPreviewPayload(values, {
        teamId,
        wvScores: teamScores?.wvScores ?? null,
        ciScores: teamScores?.ciScores ?? null,
      }),
    [values, teamId, teamScores],
  );
  useJobPreviewChannel(previewPayload);

  // 公開バリデーション失敗時: 未入力一覧バナーを表示してスクロールする
  const revealValidation = useCallback(() => {
    setShowValidation(true);
    showToast("公開するには必須項目をすべて入力してください", "error");
    requestAnimationFrame(() => {
      validationRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [showToast]);

  const handleSave = useCallback(
    async (saveStatus?: "open" | "draft") => {
      const effectiveStatus = saveStatus ?? status;
      if (effectiveStatus === "open" && !requiredOk) {
        revealValidation();
        return;
      }
      const body = buildJobPostingBody(values, effectiveStatus, teamId);
      if (!validate(jobPostingBodySchema, body)) {
        scrollToFirstError();
        return;
      }
      const isStatusChange = saveStatus != null && saveStatus !== status;
      setSavingAction(isStatusChange ? (saveStatus === "open" ? "publish" : "unpublish") : "save");
      try {
        await updateJobPosting(jobId, body);
        if (isStatusChange) {
          setStatus(effectiveStatus);
        } else {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
      } catch (err) {
        showToast(getErrorMessage(err, "保存に失敗しました"), "error");
      } finally {
        setSavingAction(null);
      }
    },
    [
      jobId,
      values,
      status,
      teamId,
      requiredOk,
      revealValidation,
      showToast,
      validate,
      scrollToFirstError,
    ],
  );

  const handleDelete = useCallback(async () => {
    if (
      !(await confirmDialog({
        title: "求人の削除",
        message: "この求人を削除しますか？この操作は元に戻せません。",
        confirmLabel: "削除する",
        destructive: true,
      }))
    )
      return;
    setDeleting(true);
    try {
      await deleteJobPosting(jobId);
      router.push("/company/jobs");
    } catch (err) {
      showToast(getErrorMessage(err, "削除に失敗しました"), "error");
    } finally {
      setDeleting(false);
    }
  }, [confirmDialog, jobId, router, showToast]);

  const statusLabel = status === "open" ? "公開中" : "下書き";
  const statusColor =
    status === "open"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f5]">
        <div className="text-sm text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="-mx-6 -mt-8 min-h-screen bg-[#f6f7f5]">
      {/* Edit toolbar */}
      <div className="sticky top-0 z-30 border-b border-blue-200 bg-blue-50 px-6 py-2.5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/company/jobs"
              className="text-sm text-[#2979ff] hover:underline inline-flex items-center gap-1"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              求人一覧
            </Link>
            <span className="text-sm text-blue-800 font-medium">編集中</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 border border-red-200 bg-white text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
              {deleting ? "削除中..." : "削除"}
            </button>
            <button
              type="button"
              onClick={() => window.open("/company/jobs/preview", "_blank")}
              className="inline-flex items-center gap-1.5 border border-gray-300 bg-white text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors cursor-pointer"
            >
              <svg
                aria-hidden="true"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              プレビュー
            </button>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${statusColor}`}
            >
              <span
                className={`h-2 w-2 rounded-full ${status === "open" ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              {statusLabel}
            </span>
            {status === "draft" ? (
              <>
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={savingAction !== null}
                  className={`${saved ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"} px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50`}
                >
                  {savingAction === "save" ? "保存中..." : saved ? "✓ 保存しました" : "下書き保存"}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!requiredOk) {
                      revealValidation();
                      return;
                    }
                    if (
                      !(await confirmDialog({
                        title: "求人の公開",
                        message: "この求人を公開しますか？求職者に表示されるようになります。",
                        confirmLabel: "公開する",
                      }))
                    )
                      return;
                    handleSave("open");
                  }}
                  disabled={savingAction !== null}
                  className={`bg-[#2979ff] text-white px-5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed ${requiredOk ? "" : "opacity-40"}`}
                  title={!requiredOk ? "必須項目を全て入力してください" : ""}
                >
                  {savingAction === "publish" ? "公開中..." : "公開する"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      !(await confirmDialog({
                        title: "求人の非公開",
                        message: "この求人を非公開にしますか？求職者から見えなくなります。",
                        confirmLabel: "非公開にする",
                      }))
                    )
                      return;
                    handleSave("draft");
                  }}
                  disabled={savingAction !== null}
                  className="border border-gray-300 bg-white text-gray-700 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer hover:bg-gray-50 disabled:opacity-50"
                >
                  {savingAction === "unpublish" ? "処理中..." : "非公開にする"}
                </button>
                <button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={savingAction !== null}
                  className={`${saved ? "bg-emerald-500 hover:bg-emerald-600" : "bg-[#2979ff] hover:bg-blue-700"} text-white px-5 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50`}
                >
                  {savingAction === "save" ? "保存中..." : saved ? "✓ 保存しました" : "保存する"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 pb-24 pt-8">
        {/* 公開バリデーション: 未入力の必須項目一覧（ドメインルール）。
            スキーマ検証の ErrorSummary と見た目を揃えて隣接配置する */}
        {showValidation && missingRequired.length > 0 && (
          <div ref={validationRef} className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm font-semibold text-red-700">
              公開するには以下の必須項目を入力してください
            </p>
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-red-600">
              {missingRequired.map((label) => (
                <li key={label} className="list-inside list-disc">
                  {label}
                </li>
              ))}
            </ul>
          </div>
        )}
        <ErrorSummary errors={fieldErrors} labels={jobPostingFieldLabels} />
        <JobPostingForm
          values={values}
          set={setField}
          company={company}
          errors={fieldErrors}
          teamSection={
            <TeamSectionWithSelector
              values={values}
              set={setField}
              teamId={teamId}
              onTeamIdChange={setTeamId}
              teamsList={teamsList}
              teamScores={teamScores}
            />
          }
        />
      </div>
    </div>
  );
}
