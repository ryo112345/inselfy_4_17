"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCompanyAuth } from "@/features/company-auth/company-auth-context";
import { type JobPostingBody, uploadTeamMemberPhoto } from "@/features/job-posting/api";
import {
  JOB_PREVIEW_CHANNEL,
  type JobFormPreviewPayload,
  type JobPreviewMessage,
} from "@/features/job-posting/preview-channel";

const ACCENT = "#3D8B6E";

const cardClass =
  "rounded-2xl border border-gray-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_6px_16px_-8px_rgba(16,24,40,0.08)]";

const JOB_CATEGORIES = [
  "エンジニア",
  "デザイナー",
  "プロダクトマネージャー",
  "マーケティング",
  "セールス",
  "カスタマーサクセス",
  "人事・採用",
  "経営企画",
  "その他",
];

const EMPLOYMENT_TYPES = [
  { value: "正社員", label: "正社員" },
  { value: "契約社員", label: "契約社員" },
  { value: "業務委託", label: "業務委託" },
  { value: "パートタイム", label: "パートタイム" },
  { value: "インターン", label: "インターン" },
];

const REMOTE_POLICIES = [
  { value: "フルリモート", label: "フルリモート" },
  { value: "リモート可（週数回出社）", label: "リモート可（週数回出社）" },
  { value: "原則出社", label: "原則出社" },
  { value: "フル出社", label: "フル出社" },
];

const SMOKING_POLICIES = [
  { value: "屋内原則禁煙（喫煙専用室あり）", label: "屋内原則禁煙（喫煙専用室あり）" },
  { value: "屋内全面禁煙", label: "屋内全面禁煙" },
  { value: "屋内禁煙（屋外に喫煙場所あり）", label: "屋内禁煙（屋外に喫煙場所あり）" },
  { value: "敷地内全面禁煙", label: "敷地内全面禁煙" },
];

const DEFAULTS = {
  title: "",
  status: "draft" as const,
  jobCategory: "",
  employmentType: "",
  hiringCount: "",
  description: "",
  appealPoints: "",
  challenges: "",
  teamDescription: "",
  teamLabel: "",
  skillsGained: "",
  tags: [] as string[],
  requiredQualifications: "",
  preferredQualifications: "",
  workLocation: "",
  workLocationChangeScope: "",
  jobDescriptionChangeScope: "",
  contractType: "",
  probationPeriod: "",
  workHours: "",
  breakTime: "",
  holidays: "",
  salaryMin: null as number | null,
  salaryMax: null as number | null,
  salaryDetail: "",
  insurance: "",
  smokingPolicy: "",
  benefits: [] as string[],
  remotePolicy: "",
  selectionProcess: "",
};

type CompanyProfile = {
  id: string;
  companyName: string;
  industry: string;
  location: string;
  employeeCount: string;
  logoUrl: string;
  benefits: string[];
  smokingPolicy: string;
  galleryUrls: string[];
};

/* ── Inline editing helpers ── */

function InlineInput({
  value,
  placeholder,
  onChange,
  className = "",
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-[${ACCENT}] transition-colors placeholder:text-gray-300 ${className}`}
    />
  );
}

function InlineTextarea({
  value,
  placeholder,
  onChange,
  rows = 3,
  className = "",
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  rows?: number;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`w-full bg-transparent outline-none border border-transparent rounded-lg hover:border-gray-300 focus:border-[${ACCENT}] transition-colors resize-y placeholder:text-gray-300 ${className}`}
    />
  );
}

function InlineSelect({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-[#3D8B6E] transition-colors cursor-pointer text-inherit font-inherit"
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function InlineTagInput({
  tags,
  onAdd,
  onRemove,
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
}) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      onAdd(input.trim());
      setInput("");
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      onRemove(tags.length - 1);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700"
        >
          #{tag}
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="hover:text-red-500 cursor-pointer ml-0.5"
          >
            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="+ タグ追加"
        className="text-sm outline-none bg-transparent text-gray-400 placeholder:text-gray-300 min-w-[80px] py-1"
      />
    </div>
  );
}

function BenefitTagInput({
  tags,
  onAdd,
  onRemove,
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
}) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && input.trim()) {
      e.preventDefault();
      onAdd(input.trim());
      setInput("");
    }
    if (e.key === "Backspace" && !input && tags.length > 0) {
      onRemove(tags.length - 1);
    }
  };

  return (
    <div className="mt-5 flex flex-wrap gap-2 items-center">
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-base font-medium"
          style={{
            borderColor: `${ACCENT}40`,
            backgroundColor: `${ACCENT}12`,
            color: ACCENT,
          }}
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="hover:opacity-60 cursor-pointer ml-0.5"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="+ 追加"
        className="text-base outline-none bg-transparent placeholder:text-gray-300 min-w-[80px] py-1"
        style={{ color: ACCENT }}
      />
    </div>
  );
}

/* ── Section components matching preview layout ── */

function EditableHighlightCard({
  label,
  title,
  onTitleChange,
  titlePlaceholder,
  value,
  onChange,
  icon,
  tone,
  placeholder,
}: {
  label: string;
  title: string;
  onTitleChange: (v: string) => void;
  titlePlaceholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  tone: { bg: string; ring: string; fg: string };
  placeholder: string;
}) {
  return (
    <div className="flex h-full flex-col gap-3.5 rounded-2xl border border-gray-200/80 bg-white p-6">
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{
            backgroundColor: tone.bg,
            color: tone.fg,
            boxShadow: `inset 0 0 0 1px ${tone.ring}`,
          }}
        >
          {icon}
        </span>
        <span
          className="text-sm font-semibold tracking-wide"
          style={{ color: tone.fg }}
        >
          {label}
        </span>
      </div>
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder={titlePlaceholder}
        className="text-lg font-bold leading-snug text-gray-900 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-[#3D8B6E] transition-colors"
      />
      <InlineTextarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        className="text-[15px] leading-relaxed text-gray-700"
      />
    </div>
  );
}

function EditableConditionGroup({
  title,
  rows,
  icon,
}: {
  title: string;
  rows: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: "text" | "textarea" | "select"; options?: { value: string; label: string }[]; readOnly?: boolean }[];
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-gray-200/80 bg-white p-6">
      <div className="mb-4 flex items-center gap-2.5 border-b border-gray-100 pb-3.5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-md"
          style={{ backgroundColor: `${ACCENT}12`, color: ACCENT }}
        >
          {icon}
        </span>
        <h3 className="text-base font-bold text-gray-900">{title}</h3>
      </div>
      <dl className="flex flex-col gap-3.5">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-1">
            <dt className="text-xs font-medium tracking-wide text-gray-500">
              {r.label}
            </dt>
            <dd>
              {r.readOnly ? (
                <span className="text-[15px] leading-relaxed text-gray-400">
                  {r.value || r.placeholder}
                </span>
              ) : r.type === "select" && r.options ? (
                <InlineSelect
                  value={r.value}
                  options={r.options}
                  onChange={r.onChange}
                  placeholder="選択"
                />
              ) : r.type === "textarea" ? (
                <InlineTextarea
                  value={r.value}
                  onChange={r.onChange}
                  placeholder={r.placeholder}
                  rows={2}
                  className="text-[15px] leading-relaxed text-gray-900"
                />
              ) : (
                <InlineInput
                  value={r.value}
                  onChange={r.onChange}
                  placeholder={r.placeholder}
                  className="text-[15px] leading-relaxed text-gray-900"
                />
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ── Main component ── */

export default function JobEditPage() {
  const { companyFetch } = useCompanyAuth();
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [title, setTitle] = useState(DEFAULTS.title);
  const [status, setStatus] = useState<"open" | "draft">(DEFAULTS.status);
  const [jobCategory, setJobCategory] = useState(DEFAULTS.jobCategory);
  const [employmentType, setEmploymentType] = useState(DEFAULTS.employmentType);
  const [hiringCount, setHiringCount] = useState(DEFAULTS.hiringCount);
  const [description, setDescription] = useState(DEFAULTS.description);
  const [appealPoints, setAppealPoints] = useState(DEFAULTS.appealPoints);
  const [challenges, setChallenges] = useState(DEFAULTS.challenges);
  const [teamDescription, setTeamDescription] = useState(DEFAULTS.teamDescription);
  const [teamLabel, setTeamLabel] = useState(DEFAULTS.teamLabel);
  const [skillsGained, setSkillsGained] = useState(DEFAULTS.skillsGained);
  const [tags, setTags] = useState(DEFAULTS.tags);
  const [requiredQualifications, setRequiredQualifications] = useState(DEFAULTS.requiredQualifications);
  const [preferredQualifications, setPreferredQualifications] = useState(DEFAULTS.preferredQualifications);
  const [workLocation, setWorkLocation] = useState(DEFAULTS.workLocation);
  const [workLocationChangeScope, setWorkLocationChangeScope] = useState(DEFAULTS.workLocationChangeScope);
  const [jobDescriptionChangeScope, setJobDescriptionChangeScope] = useState(DEFAULTS.jobDescriptionChangeScope);
  const [contractType, setContractType] = useState(DEFAULTS.contractType);
  const [probationPeriod, setProbationPeriod] = useState(DEFAULTS.probationPeriod);
  const [workHours, setWorkHours] = useState(DEFAULTS.workHours);
  const [breakTime, setBreakTime] = useState(DEFAULTS.breakTime);
  const [holidays, setHolidays] = useState(DEFAULTS.holidays);
  const [salaryMin, setSalaryMin] = useState<number | null>(DEFAULTS.salaryMin);
  const [salaryMax, setSalaryMax] = useState<number | null>(DEFAULTS.salaryMax);
  const [salaryDetail, setSalaryDetail] = useState(DEFAULTS.salaryDetail);
  const [insurance, setInsurance] = useState(DEFAULTS.insurance);
  const [smokingPolicy, setSmokingPolicy] = useState(DEFAULTS.smokingPolicy);
  const [benefits, setBenefits] = useState(DEFAULTS.benefits);
  const [remotePolicy, setRemotePolicy] = useState(DEFAULTS.remotePolicy);
  const [selectionProcess, setSelectionProcess] = useState(DEFAULTS.selectionProcess);
  const [highlightTitleRole, setHighlightTitleRole] = useState("仕事内容");
  const [highlightTitleAppeal, setHighlightTitleAppeal] = useState("この仕事の魅力");
  const [highlightTitleChallenge, setHighlightTitleChallenge] = useState("チャレンジ");
  const [highlightTitleGrowth, setHighlightTitleGrowth] = useState("身につくスキル");
  const [teamMembers, setTeamMembers] = useState<{ name: string; photoUrl?: string }[]>([]);
  const [memberInput, setMemberInput] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverImageDataUrl, setCoverImageDataUrl] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  useEffect(() => {
    companyFetch(`/api/company/jobs/${jobId}`).then(async (res) => {
      if (res.ok) {
        const d = await res.json();
        setTitle(d.title ?? "");
        setStatus(d.status === "open" ? "open" : "draft");
        setJobCategory(d.jobCategory ?? "");
        setEmploymentType(d.employmentType ?? "");
        setHiringCount(d.hiringCount ?? "");
        setDescription(d.description ?? "");
        setAppealPoints(d.appealPoints ?? "");
        setChallenges(d.challenges ?? "");
        setTeamDescription(d.teamDescription ?? "");
        setTeamLabel(d.teamLabel ?? "");
        setSkillsGained(d.skillsGained ?? "");
        setTags(d.tags ?? []);
        setRequiredQualifications(d.requiredQualifications ?? "");
        setPreferredQualifications(d.preferredQualifications ?? "");
        setWorkLocation(d.workLocation ?? "");
        setWorkLocationChangeScope(d.workLocationChangeScope ?? "");
        setJobDescriptionChangeScope(d.jobDescriptionChangeScope ?? "");
        setContractType(d.contractType ?? "");
        setProbationPeriod(d.probationPeriod ?? "");
        setWorkHours(d.workHours ?? "");
        setBreakTime(d.breakTime ?? "");
        setHolidays(d.holidays ?? "");
        setSalaryMin(d.salaryMin ?? null);
        setSalaryMax(d.salaryMax ?? null);
        setSalaryDetail(d.salaryDetail ?? "");
        setInsurance(d.insurance ?? "");
        setSmokingPolicy(d.smokingPolicy ?? "");
        setBenefits(d.benefits ? d.benefits.split("\n").filter(Boolean) : []);
        setRemotePolicy(d.remotePolicy ?? "");
        setSelectionProcess(d.selectionProcess ?? "");
        setHighlightTitleRole(d.highlightTitleRole || "仕事内容");
        setHighlightTitleAppeal(d.highlightTitleAppeal || "この仕事の魅力");
        setHighlightTitleChallenge(d.highlightTitleChallenge || "チャレンジ");
        setHighlightTitleGrowth(d.highlightTitleGrowth || "身につくスキル");
        setTeamMembers(d.teamMembers ?? []);
        if (d.coverImageUrl) setCoverImage(d.coverImageUrl);
      }
    }).finally(() => setIsLoading(false));
  }, [companyFetch, jobId]);

  useEffect(() => {
    companyFetch("/api/company/profile").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (!Array.isArray(data.benefits)) data.benefits = [];
        setCompany({
          id: data.id,
          companyName: data.companyName,
          industry: data.industry,
          location: data.location,
          employeeCount: data.employeeCount,
          logoUrl: data.logoUrl,
          benefits: data.benefits ?? [],
          smokingPolicy: data.smokingPolicy ?? "",
          galleryUrls: data.galleryUrls ?? [],
        });
      }
    });
  }, [companyFetch]);

  // BroadcastChannel for preview tab sync
  const channelRef = useRef<BroadcastChannel | null>(null);
  const previewPayloadRef = useRef<JobFormPreviewPayload | null>(null);

  useEffect(() => {
    const ch = new BroadcastChannel(JOB_PREVIEW_CHANNEL);
    channelRef.current = ch;
    ch.onmessage = (e) => {
      const msg = e.data as JobPreviewMessage;
      if (msg?.type === "request" && previewPayloadRef.current) {
        const reply: JobPreviewMessage = {
          type: "data",
          payload: previewPayloadRef.current,
        };
        ch.postMessage(reply);
      }
    };
    return () => { ch.close(); };
  }, []);

  const previewPayload = useMemo<JobFormPreviewPayload>(
    () => ({
      title, jobCategory, employmentType, hiringCount, description,
      appealPoints, challenges, teamDescription, teamMembers, teamLabel, skillsGained, tags,
      requiredQualifications, preferredQualifications, workLocation,
      workLocationChangeScope, jobDescriptionChangeScope, contractType,
      probationPeriod, workHours, breakTime, holidays, salaryMin, salaryMax,
      salaryDetail, insurance, remotePolicy,
      benefits: benefits.join("\n"), smokingPolicy,
      selectionProcess,
      highlightTitleRole, highlightTitleAppeal,
      highlightTitleChallenge, highlightTitleGrowth,
      coverImageDataUrl,
    }),
    [
      title, jobCategory, employmentType, hiringCount, description,
      appealPoints, challenges, teamDescription, teamMembers, teamLabel, skillsGained, tags,
      requiredQualifications, preferredQualifications, workLocation,
      workLocationChangeScope, jobDescriptionChangeScope, contractType,
      probationPeriod, workHours, breakTime, holidays, salaryMin, salaryMax,
      salaryDetail, insurance, remotePolicy, benefits, smokingPolicy,
      selectionProcess, highlightTitleRole, highlightTitleAppeal,
      highlightTitleChallenge, highlightTitleGrowth, coverImageDataUrl,
    ],
  );

  useEffect(() => {
    previewPayloadRef.current = previewPayload;
    const msg: JobPreviewMessage = { type: "data", payload: previewPayload };
    channelRef.current?.postMessage(msg);
  }, [previewPayload]);

  const requiredOk =
    title.trim() !== "" &&
    jobCategory !== "" &&
    employmentType !== "" &&
    description.trim() !== "" &&
    requiredQualifications.trim() !== "" &&
    workLocation.trim() !== "" &&
    contractType.trim() !== "" &&
    probationPeriod.trim() !== "" &&
    workHours.trim() !== "" &&
    breakTime.trim() !== "" &&
    holidays.trim() !== "" &&
    (salaryMin != null || salaryMax != null || salaryDetail.trim() !== "") &&
    insurance.trim() !== "" &&
    smokingPolicy !== "" &&
    workLocationChangeScope.trim() !== "" &&
    jobDescriptionChangeScope.trim() !== "";

  const handleSave = useCallback(async () => {
    if (status === "open" && !requiredOk) {
      alert("公開するには必須項目をすべて入力してください");
      return;
    }
    setSaving(true);
    try {
      const body: JobPostingBody = {
        title, description, employmentType, location: null, status,
        jobCategory, hiringCount, appealPoints, challenges, teamDescription,
        teamMembers, teamLabel,
        skillsGained, tags, requiredQualifications, preferredQualifications,
        workLocation, workLocationChangeScope, jobDescriptionChangeScope,
        contractType, probationPeriod, workHours, breakTime, holidays,
        salaryMin, salaryMax, salaryDetail, insurance, remotePolicy,
        benefits: benefits.join("\n"), smokingPolicy, selectionProcess,
        coverImageUrl: coverImage ?? "",
        highlightTitleRole, highlightTitleAppeal, highlightTitleChallenge, highlightTitleGrowth,
      };
      const res = await companyFetch(`/api/company/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message ?? "保存に失敗しました");
      }
    } finally {
      setSaving(false);
    }
  }, [
    companyFetch, jobId, title, description, employmentType, status,
    jobCategory, hiringCount, appealPoints, challenges, teamDescription, teamMembers, teamLabel,
    skillsGained, tags, requiredQualifications, preferredQualifications,
    workLocation, workLocationChangeScope, jobDescriptionChangeScope,
    contractType, probationPeriod, workHours, breakTime, holidays,
    salaryMin, salaryMax, salaryDetail, insurance, remotePolicy,
    benefits, smokingPolicy, selectionProcess, coverImage,
    highlightTitleRole, highlightTitleAppeal, highlightTitleChallenge, highlightTitleGrowth,
  ]);

  const handleDelete = useCallback(async () => {
    if (!confirm("この求人を削除しますか？この操作は元に戻せません。")) return;
    setDeleting(true);
    try {
      const res = await companyFetch(`/api/company/jobs/${jobId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/company/jobs");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message ?? "削除に失敗しました");
      }
    } finally {
      setDeleting(false);
    }
  }, [companyFetch, jobId, router]);

  const metaBadges = [employmentType, jobCategory, remotePolicy].filter(Boolean);

  const selectionSteps = selectionProcess
    ? selectionProcess.split("→").map((s) => s.trim()).filter(Boolean)
    : [];

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
    <div className="min-h-screen bg-[#f6f7f5]">
      {/* Edit toolbar */}
      <div className="sticky top-0 z-30 border-b border-blue-200 bg-blue-50 px-6 py-2.5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/company/jobs"
              className="text-sm text-[#2979ff] hover:underline inline-flex items-center gap-1"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              求人一覧
            </Link>
            <span className="text-sm text-blue-800 font-medium">
              編集中 — 見た目そのままで編集できます
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 border border-red-200 bg-white text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              </svg>
              {deleting ? "削除中..." : "削除"}
            </button>
<button
              type="button"
              onClick={() => window.open("/company/jobs/preview", "_blank")}
              className="inline-flex items-center gap-1.5 border border-gray-300 bg-white text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors cursor-pointer"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              プレビュー
            </button>
            <button
              type="button"
              onClick={() => setStatus(status === "open" ? "draft" : "open")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors ${statusColor}`}
            >
              <span className={`h-2 w-2 rounded-full ${status === "open" ? "bg-emerald-500" : "bg-amber-500"}`} />
              {statusLabel}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#2979ff] text-white px-5 py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存する"}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-3 px-4 pb-24 pt-8">
        {/* Hero */}
        <section className={`overflow-hidden ${cardClass}`}>
          {/* Cover image */}
          {coverImage ? (
            <div className="relative group">
              <img src={coverImage} alt="" className="w-full aspect-[16/9] object-cover" />
              <button
                type="button"
                onClick={() => { setCoverImage(null); setCoverImageDataUrl(null); }}
                className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center py-10 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
              <svg className="h-8 w-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
              </svg>
              <span className="mt-2 text-sm text-gray-400">カバー写真を追加</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCoverImage(URL.createObjectURL(file));
                    const reader = new FileReader();
                    reader.onload = () => setCoverImageDataUrl(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          )}

          <div className="px-6 pb-6 pt-6 sm:px-8">
            {company && (
              <div className="inline-flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden bg-white">
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold" style={{ color: ACCENT }}>
                      {company.companyName.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-base font-medium text-gray-900">{company.companyName}</p>
                  <p className="text-sm text-gray-500">
                    {company.industry} / {company.location}
                  </p>
                </div>
              </div>
            )}

            {/* Editable title */}
            <textarea
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              ref={(el) => {
                if (el) {
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }
              }}
              rows={1}
              placeholder="求人タイトルを入力..."
              className="mt-5 w-full text-2xl font-bold tracking-tight text-gray-900 leading-snug sm:text-[26px] bg-transparent outline-none border-b-2 border-transparent hover:border-gray-200 focus:border-[#3D8B6E] transition-colors pb-1 resize-none overflow-hidden"
            />

            {/* Meta badges — editable selects */}
            <div className="mt-5 flex flex-wrap gap-2 items-center">
              <span
                className="inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium"
                style={{ borderColor: `${ACCENT}40`, backgroundColor: `${ACCENT}12`, color: ACCENT }}
              >
                <InlineSelect
                  value={employmentType}
                  options={EMPLOYMENT_TYPES}
                  onChange={setEmploymentType}
                  placeholder="雇用形態"
                />
              </span>
              <span
                className="inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium"
                style={{ borderColor: `${ACCENT}40`, backgroundColor: `${ACCENT}12`, color: ACCENT }}
              >
                <InlineSelect
                  value={jobCategory}
                  options={JOB_CATEGORIES.map((c) => ({ value: c, label: c }))}
                  onChange={setJobCategory}
                  placeholder="職種カテゴリ"
                />
              </span>
              <span
                className="inline-flex items-center rounded-full border px-3.5 py-1.5 text-sm font-medium"
                style={{ borderColor: `${ACCENT}40`, backgroundColor: `${ACCENT}12`, color: ACCENT }}
              >
                <InlineSelect
                  value={remotePolicy}
                  options={REMOTE_POLICIES}
                  onChange={setRemotePolicy}
                  placeholder="勤務形態"
                />
              </span>
            </div>

            {/* Tags */}
            <div className="mt-3">
              <InlineTagInput
                tags={tags}
                onAdd={(tag) => setTags([...tags, tag])}
                onRemove={(i) => setTags(tags.filter((_, idx) => idx !== i))}
              />
            </div>

            {/* Quick Facts */}
            <div className="mt-6 grid grid-cols-2 divide-x divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 bg-gray-50/40 sm:grid-cols-4 sm:divide-y-0">
              <div className="flex flex-col gap-2 px-4 py-5 sm:px-5">
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                  <span className="text-gray-400"><YenIcon /></span>
                  想定年収
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={salaryMin ?? ""}
                    onChange={(e) => setSalaryMin(e.target.value ? Number(e.target.value) : null)}
                    placeholder="下限"
                    className="w-16 text-xl font-bold text-gray-900 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-[#3D8B6E] transition-colors"
                  />
                  <span className="text-base font-medium text-gray-500">〜</span>
                  <input
                    type="number"
                    value={salaryMax ?? ""}
                    onChange={(e) => setSalaryMax(e.target.value ? Number(e.target.value) : null)}
                    placeholder="上限"
                    className="w-16 text-xl font-bold text-gray-900 bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-[#3D8B6E] transition-colors"
                  />
                  <span className="ml-0.5 text-sm font-medium text-gray-500">万円</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 px-4 py-5 sm:px-5">
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                  <span className="text-gray-400"><BriefcaseIcon /></span>
                  雇用形態
                </div>
                <div className="text-xl font-bold leading-tight text-gray-900">
                  {employmentType || <span className="text-sm font-normal italic text-gray-300">未選択</span>}
                </div>
              </div>
              <div className="flex flex-col gap-2 px-4 py-5 sm:px-5">
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                  <span className="text-gray-400"><UsersIcon /></span>
                  採用人数
                </div>
                <InlineInput
                  value={hiringCount}
                  onChange={setHiringCount}
                  placeholder="例: 1〜2名"
                  className="text-xl font-bold leading-tight text-gray-900"
                />
              </div>
              <div className="flex flex-col gap-2 px-4 py-5 sm:px-5">
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
                  <span className="text-gray-400"><HomeIcon /></span>
                  勤務形態
                </div>
                <div className="text-xl font-bold leading-tight text-gray-900">
                  {remotePolicy || <span className="text-sm font-normal italic text-gray-300">未選択</span>}
                </div>
              </div>
            </div>

            <div className="mt-7 flex gap-3">
              <button
                disabled
                className="flex-1 rounded-xl py-4 text-center text-base font-bold text-white opacity-60"
                style={{ background: ACCENT }}
              >
                この求人に応募する
              </button>
              <button
                disabled
                className="rounded-xl border border-gray-300 px-5 py-4 text-base font-medium text-gray-700 opacity-60"
              >
                <BookmarkIcon />
              </button>
            </div>
          </div>
        </section>

        {/* Highlights */}
        <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
          <SectionTitle icon={<LayersIcon />}>ハイライト</SectionTitle>
          <p className="mt-2 text-sm text-gray-500">
            この仕事を一目で掴むための4つの視点
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <EditableHighlightCard
              label="ROLE"
              title={highlightTitleRole}
              onTitleChange={setHighlightTitleRole}
              titlePlaceholder="仕事内容"
              value={description}
              onChange={setDescription}
              icon={<SparkIcon />}
              tone={{ bg: "#EAF4F0", ring: "#3D8B6E33", fg: "#3D8B6E" }}
              placeholder="この求人の仕事内容を記入..."
            />
            <EditableHighlightCard
              label="APPEAL"
              title={highlightTitleAppeal}
              onTitleChange={setHighlightTitleAppeal}
              titlePlaceholder="この仕事の魅力"
              value={appealPoints}
              onChange={setAppealPoints}
              icon={<StarIcon />}
              tone={{ bg: "#FEF7E6", ring: "#E0A92033", fg: "#B07914" }}
              placeholder="この求人の魅力を記入..."
            />
            <EditableHighlightCard
              label="CHALLENGE"
              title={highlightTitleChallenge}
              onTitleChange={setHighlightTitleChallenge}
              titlePlaceholder="チャレンジ"
              value={challenges}
              onChange={setChallenges}
              icon={<FlagIcon />}
              tone={{ bg: "#EEF2FB", ring: "#3B82F633", fg: "#3B6FCC" }}
              placeholder="この仕事で直面するチャレンジを記入..."
            />
            <EditableHighlightCard
              label="GROWTH"
              title={highlightTitleGrowth}
              onTitleChange={setHighlightTitleGrowth}
              titlePlaceholder="身につくスキル"
              value={skillsGained}
              onChange={setSkillsGained}
              icon={<BoltIcon />}
              tone={{ bg: "#F3EEFB", ring: "#8B5CF633", fg: "#7647C5" }}
              placeholder="この求人で身につくスキルを記入..."
            />
          </div>
        </section>

        {/* Photo gallery */}
        <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
          <SectionTitle icon={<CameraIcon />}>フォトギャラリー</SectionTitle>
          {galleryImages.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {galleryImages.map((url, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden aspect-[4/3]">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setGalleryImages(galleryImages.filter((_, idx) => idx !== i))}
                    className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <label className="mt-3 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-6 cursor-pointer hover:border-gray-300 hover:bg-gray-50 transition-colors">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
            <span className="text-sm text-gray-400">写真を追加</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files) {
                  const urls = Array.from(files).map((f) => URL.createObjectURL(f));
                  setGalleryImages((prev) => [...prev, ...urls]);
                }
              }}
            />
          </label>
        </section>

        {/* Team */}
        <section className={`overflow-hidden ${cardClass}`}>
          <div className="grid grid-cols-1 sm:grid-cols-[360px_1fr]">
            <div
              className="flex flex-col items-center justify-center gap-4 px-6 py-8 sm:py-10"
              style={{ background: `linear-gradient(135deg, ${ACCENT}14 0%, ${ACCENT}06 100%)` }}
            >
                <div className="flex flex-col -space-y-10">
                {(() => {
                  const items = teamMembers.length > 0 ? teamMembers : [{ name: "" } as { name: string; photoUrl?: string }];
                  const rows: typeof items[] = [];
                  for (let r = 0; r < items.length; r += 5) rows.push(items.slice(r, r + 5));
                  return rows.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex items-center -space-x-[18px]" style={{ paddingLeft: rowIdx % 2 === 1 ? '1.75rem' : 0 }}>
                      {row.map((m, colIdx) => {
                        const i = rowIdx * 5 + colIdx;
                        const colors = [
                          { bg: "#EAF4F0", fg: "#3D8B6E" },
                          { bg: "#EEF2FB", fg: "#3B6FCC" },
                          { bg: "#FEF7E6", fg: "#B07914" },
                          { bg: "#F3EEFB", fg: "#7647C5" },
                          { bg: "#FEE", fg: "#C54747" },
                        ];
                        const color = colors[i % colors.length];
                        const isReal = teamMembers.length > 0;
                        return (
                          <label key={i} className={`relative ${isReal ? "cursor-pointer group" : ""}`}>
                      <div
                        className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-white text-2xl font-bold shadow-sm overflow-hidden"
                        style={{ backgroundColor: color.bg, color: color.fg }}
                      >
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt={m.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className={!m.name ? "text-2xl" : m.name.length >= 5 ? "text-xs" : m.name.length === 4 ? "text-sm" : m.name.length === 3 ? "text-base" : m.name.length === 2 ? "text-xl" : "text-2xl"}>
                            {m.name ? m.name.slice(0, 5) : "?"}
                          </span>
                        )}
                      </div>
                      {isReal && !m.photoUrl && (
                        <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-400 group-hover:text-blue-500 group-hover:border-blue-300 transition-colors">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                        </span>
                      )}
                      {isReal && m.photoUrl && (
                        <span className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm border border-gray-200 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                        </span>
                      )}
                      {isReal && (
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const url = await uploadTeamMemberPhoto(file);
                              setTeamMembers((prev) =>
                                prev.map((member, idx) =>
                                  idx === i ? { ...member, photoUrl: url } : member,
                                ),
                              );
                            } catch {
                              // upload failed
                            }
                            e.target.value = "";
                          }}
                        />
                      )}
                          </label>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
              <input
                type="text"
                value={teamLabel}
                onChange={(e) => setTeamLabel(e.target.value)}
                placeholder="例: 少数精鋭の営業チーム"
                className="w-52 text-center text-base font-semibold bg-transparent outline-none border-b border-transparent hover:border-gray-300 focus:border-[#3D8B6E] transition-colors placeholder:text-gray-300"
                style={{ color: ACCENT }}
              />
            </div>
            <div className="px-6 py-6 sm:px-7 sm:py-7 flex flex-col">
              <h2 className="text-lg font-bold text-gray-900">チーム紹介</h2>
              <div className="mt-3 flex-1 flex">
                <InlineTextarea
                  value={teamDescription}
                  onChange={setTeamDescription}
                  placeholder="チームの雰囲気やメンバー構成を記入..."
                  className="text-[15px] leading-relaxed text-gray-700 flex-1"
                />
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 px-6 py-4">
            <h4 className="text-sm font-medium text-gray-500 mb-2">メンバー</h4>
            <div className="flex flex-wrap gap-2 items-center">
              {teamMembers.map((m, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700"
                >
                  {m.name}
                  <button
                    type="button"
                    onClick={() => setTeamMembers(teamMembers.filter((_, idx) => idx !== i))}
                    className="hover:text-red-500 cursor-pointer ml-0.5"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={memberInput}
                onChange={(e) => setMemberInput(e.target.value)}
                placeholder="+ メンバー追加"
                className="text-sm outline-none bg-transparent text-gray-400 placeholder:text-gray-300 min-w-[100px] py-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing && memberInput.trim()) {
                    e.preventDefault();
                    setTeamMembers([...teamMembers, { name: memberInput.trim() }]);
                    setMemberInput("");
                  }
                }}
              />
            </div>
          </div>
        </section>

        {/* Conditions */}
        <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
          <SectionTitle icon={<DocumentIcon />}>募集要項</SectionTitle>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <EditableConditionGroup
              title="勤務情報"
              icon={<ClockIcon />}
              rows={[
                { label: "勤務地", value: workLocation, onChange: setWorkLocation, placeholder: "例: 東京都渋谷区" },
                { label: "勤務時間", value: workHours, onChange: setWorkHours, placeholder: "例: 9:00〜18:00" },
                { label: "休憩時間", value: breakTime, onChange: setBreakTime, placeholder: "例: 60分" },
                { label: "休日・休暇", value: holidays, onChange: setHolidays, placeholder: "休日・休暇を入力...", type: "textarea" },
              ]}
            />
            <EditableConditionGroup
              title="給与・報酬"
              icon={<YenIcon />}
              rows={[
                {
                  label: "年収レンジ",
                  value: salaryMin != null || salaryMax != null
                    ? `${salaryMin ?? "?"}万円 〜 ${salaryMax ?? "?"}万円`
                    : "",
                  onChange: () => {},
                  placeholder: "上部の想定年収欄で入力",
                  readOnly: true,
                },
                { label: "給与詳細", value: salaryDetail, onChange: setSalaryDetail, placeholder: "給与の詳細を入力...", type: "textarea" },
                { label: "社会保険", value: insurance, onChange: setInsurance, placeholder: "例: 健康保険、厚生年金..." },
              ]}
            />
            <EditableConditionGroup
              title="契約・その他"
              icon={<ShieldIcon />}
              rows={[
                { label: "契約期間", value: contractType, onChange: setContractType, placeholder: "例: 無期" },
                { label: "試用期間", value: probationPeriod, onChange: setProbationPeriod, placeholder: "例: 入社後3ヶ月" },
                { label: "就業場所の変更範囲", value: workLocationChangeScope, onChange: setWorkLocationChangeScope, placeholder: "例: 当面なし" },
                { label: "業務内容の変更範囲", value: jobDescriptionChangeScope, onChange: setJobDescriptionChangeScope, placeholder: "例: 当面なし" },
                {
                  label: "受動喫煙対策",
                  value: smokingPolicy,
                  onChange: setSmokingPolicy,
                  placeholder: "選択",
                  type: "select",
                  options: SMOKING_POLICIES,
                },
              ]}
            />
          </div>
        </section>

        {/* Requirements */}
        <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
          <SectionTitle icon={<CheckSquareIcon />}>応募要件</SectionTitle>
          <div className="mt-5 space-y-5">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <span
                  className="inline-flex h-6 items-center rounded px-2 text-sm font-bold text-white"
                  style={{ background: ACCENT }}
                >
                  必須
                </span>
                必須要件
              </h3>
              <InlineTextarea
                value={requiredQualifications}
                onChange={setRequiredQualifications}
                placeholder="必須の資格・経験・スキルを入力..."
                rows={3}
                className="mt-2.5 text-[15px] leading-relaxed text-gray-700"
              />
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <span className="inline-flex h-6 items-center rounded bg-gray-400 px-2 text-sm font-bold text-white">
                  歓迎
                </span>
                歓迎要件
              </h3>
              <InlineTextarea
                value={preferredQualifications}
                onChange={setPreferredQualifications}
                placeholder="あると望ましい資格・経験・スキルを入力..."
                rows={3}
                className="mt-2.5 text-[15px] leading-relaxed text-gray-700"
              />
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
          <SectionTitle icon={<GiftIcon />}>福利厚生・待遇</SectionTitle>
          <BenefitTagInput
            tags={benefits}
            onAdd={(tag) => setBenefits([...benefits, tag])}
            onRemove={(i) => setBenefits(benefits.filter((_, idx) => idx !== i))}
          />
        </section>

        {/* Selection */}
        <section className={`px-6 py-6 sm:px-7 ${cardClass}`}>
          <SectionTitle icon={<RouteIcon />}>選考フロー</SectionTitle>
          <InlineInput
            value={selectionProcess}
            onChange={setSelectionProcess}
            placeholder="例: 書類選考 → 技術面接 → 最終面接 → 内定"
            className="mt-4 text-base text-gray-700"
          />
          {selectionSteps.length > 0 && (
            <ol className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              {selectionSteps.map((step, i, arr) => (
                <li key={i} className="flex items-center gap-2">
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: ACCENT }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-base font-medium text-gray-800 whitespace-nowrap">
                      {step}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <svg className="h-5 w-5 shrink-0 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  )}
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* Company */}
        {company && (
          <section className={`overflow-hidden ${cardClass}`}>
            <div className="px-6 py-6 sm:px-7">
              <SectionTitle icon={<BuildingIcon />}>企業情報</SectionTitle>
              <div className="mt-5 flex items-center gap-4 rounded-xl border border-gray-200 p-4">
                <div className="h-14 w-14 rounded-xl border border-gray-200 flex items-center justify-center overflow-hidden bg-white shrink-0">
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold" style={{ color: ACCENT }}>
                      {company.companyName.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-bold text-gray-900">{company.companyName}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {company.industry} / {company.location} / {company.employeeCount}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ── Shared section title ── */

function SectionTitle({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon && (
        <span
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${ACCENT}14`, color: ACCENT }}
        >
          {icon}
        </span>
      )}
      <h2 className="text-xl font-bold tracking-tight text-gray-900">
        {children}
      </h2>
    </div>
  );
}

/* ── Icons ── */

function BookmarkIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function YenIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4l7 9 7-9" /><path d="M7 13h10" /><path d="M7 17h10" /><path d="M12 13v7" />
    </svg>
  );
}
function BriefcaseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 13h18" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function HomeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
    </svg>
  );
}
function LayersIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
    </svg>
  );
}
function SparkIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4" /><path d="M12 17v4" /><path d="M3 12h4" /><path d="M17 12h4" /><path d="M5.6 5.6l2.8 2.8" /><path d="M15.6 15.6l2.8 2.8" /><path d="M5.6 18.4l2.8-2.8" /><path d="M15.6 8.4l2.8-2.8" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.9 6.9L22 10l-5.5 4.7L18 22l-6-3.6L6 22l1.5-7.3L2 10l7.1-1.1z" />
    </svg>
  );
}
function FlagIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22V4" /><path d="M4 4h13l-2 4 2 4H4" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2L3 14h7l-1 8 11-13h-7z" />
    </svg>
  );
}
function CheckSquareIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3 8-8" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
function GiftIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" /><path d="M8 8a2.5 2.5 0 0 1 0-5C10 3 12 5 12 8" /><path d="M16 8a2.5 2.5 0 0 0 0-5C14 3 12 5 12 8" />
    </svg>
  );
}
function CameraIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function DocumentIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h6" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z" />
    </svg>
  );
}
function RouteIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="3" /><circle cx="18" cy="5" r="3" /><path d="M6 16V8a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h.01" /><path d="M14 8h.01" /><path d="M9 12h.01" /><path d="M14 12h.01" /><path d="M9 16h.01" /><path d="M14 16h.01" />
    </svg>
  );
}
