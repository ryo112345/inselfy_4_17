"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const SECTIONS = [
  { id: "basic", label: "基本情報" },
  { id: "content", label: "求人コンテンツ" },
  { id: "requirements", label: "応募要件" },
  { id: "conditions", label: "就業条件" },
  { id: "compensation", label: "報酬・福利厚生" },
  { id: "selection", label: "選考・公開" },
] as const;

const MOCK_DATA = {
  title: "バックエンドエンジニア｜Go / PostgreSQL / AWS でプロダクト基盤を設計",
  status: "open" as const,
  jobCategory: "エンジニア",
  employmentType: "正社員",
  hiringCount: "1〜2名",
  description:
    "inselfyの価値観マッチングエンジンを支えるAPI基盤の設計・開発をリードしていただきます。Bradley-Terryモデルによるスコアリング、pgvectorを活用したベクトル検索、リアルタイム推薦アルゴリズムなど、データと密接に結びついたバックエンド開発が中心です。",
  appealPoints:
    "独自の価値観診断アルゴリズムとマッチングエンジンの開発に携われます。少人数チームのため、技術選定からアーキテクチャ設計まで裁量を持って取り組める環境です。フルリモート・フルフレックスで、自律的に働ける文化を大切にしています。",
  challenges:
    "急成長フェーズのプロダクトで、スケーラビリティとパフォーマンスの両立が求められます。統計モデルの実装やベクトル検索の最適化など、一般的なCRUD開発とは異なる技術的チャレンジがあります。",
  teamDescription:
    "現在エンジニア5名のチームで、全員がフルスタック志向を持ちながらもバックエンドに強みを持つメンバーが揃っています。コードレビューを重視し、技術的な議論を日常的に行うカルチャーです。",
  skillsGained:
    "Go言語での大規模API設計スキル、統計モデルの実装経験、ベクトルデータベースの運用知識、AWSインフラの設計・構築スキルが身につきます。",
  tags: ["Go", "PostgreSQL", "AWS", "pgvector", "API設計", "マッチングアルゴリズム"],
  requiredQualifications:
    "Go言語でのWebアプリケーション開発経験3年以上。RDBMSを用いたバックエンド開発の実務経験。",
  preferredQualifications:
    "PostgreSQLの運用・チューニング経験。AWSでのインフラ構築経験。統計学やデータサイエンスへの興味。OSS活動やテックブログでの発信経験。",
  workLocation: "東京都渋谷区（フルリモート勤務可）",
  workLocationChangeScope: "当面なし",
  jobDescriptionChangeScope: "当面なし",
  contractType: "無期",
  probationPeriod: "入社後3ヶ月（条件変更なし）",
  workHours: "フレックスタイム制（コアタイムなし）標準労働時間8時間",
  breakTime: "60分",
  holidays:
    "完全週休2日制（土日祝）、年末年始休暇、有給休暇（入社半年後10日付与）、慶弔休暇、産前産後休暇、育児休暇",
  salaryMin: 600,
  salaryMax: 1000,
  salaryDetail:
    "月給50万円〜83万円（固定残業代45時間分を含む）。経験・能力を考慮の上決定。",
  insurance: "健康保険、厚生年金、雇用保険、労災保険",
  smokingPolicy: "屋内原則禁煙（喫煙専用室あり）",
  benefits:
    "リモートワーク手当月3万円\n書籍購入費全額補助\nカンファレンス参加費補助\n副業OK",
  remotePolicy: "フルリモート",
  selectionProcess:
    "書類選考 → 技術面接（コーディングテスト含む） → 最終面接 → 内定",
};

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

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
      {children}
    </h2>
  );
}

function FieldLabel({
  children,
  required,
  sub,
}: {
  children: React.ReactNode;
  required?: boolean;
  sub?: string;
}) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
      {sub && (
        <span className="ml-2 text-xs font-normal text-gray-400">{sub}</span>
      )}
    </label>
  );
}

function TextInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2979ff]/30 focus:border-[#2979ff] transition-colors"
    />
  );
}

function TextArea({
  value,
  placeholder,
  rows,
  onChange,
}: {
  value: string;
  placeholder?: string;
  rows?: number;
  onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows ?? 4}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2979ff]/30 focus:border-[#2979ff] transition-colors resize-y"
    />
  );
}

function SelectInput({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2979ff]/30 focus:border-[#2979ff] transition-colors bg-white"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function TagInput({
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
    <div className="border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-[#2979ff]/30 focus-within:border-[#2979ff] transition-colors">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 bg-blue-50 text-[#2979ff] text-xs font-medium px-2.5 py-1 rounded-md"
          >
            {tag}
            <button
              onClick={() => onRemove(i)}
              className="hover:text-blue-800 cursor-pointer"
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
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? "タグを入力してEnter" : ""}
          className="flex-1 min-w-[120px] text-sm outline-none py-0.5"
        />
      </div>
    </div>
  );
}

function SalaryRangeInput({
  min,
  max,
  onMinChange,
  onMaxChange,
}: {
  min: number | null;
  max: number | null;
  onMinChange: (v: number | null) => void;
  onMaxChange: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <input
          type="number"
          value={min ?? ""}
          onChange={(e) =>
            onMinChange(e.target.value ? Number(e.target.value) : null)
          }
          placeholder="下限"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2979ff]/30 focus:border-[#2979ff] transition-colors"
        />
      </div>
      <span className="text-gray-400 text-sm">〜</span>
      <div className="flex-1">
        <input
          type="number"
          value={max ?? ""}
          onChange={(e) =>
            onMaxChange(e.target.value ? Number(e.target.value) : null)
          }
          placeholder="上限"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2979ff]/30 focus:border-[#2979ff] transition-colors"
        />
      </div>
      <span className="text-sm text-gray-500 shrink-0">万円</span>
    </div>
  );
}

export default function JobEditPage() {
  const [activeSection, setActiveSection] = useState("basic");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const [title, setTitle] = useState(MOCK_DATA.title);
  const [status, setStatus] = useState<"open" | "draft">(MOCK_DATA.status);
  const [jobCategory, setJobCategory] = useState(MOCK_DATA.jobCategory);
  const [employmentType, setEmploymentType] = useState(
    MOCK_DATA.employmentType,
  );
  const [hiringCount, setHiringCount] = useState(MOCK_DATA.hiringCount);
  const [description, setDescription] = useState(MOCK_DATA.description);
  const [appealPoints, setAppealPoints] = useState(MOCK_DATA.appealPoints);
  const [challenges, setChallenges] = useState(MOCK_DATA.challenges);
  const [teamDescription, setTeamDescription] = useState(
    MOCK_DATA.teamDescription,
  );
  const [skillsGained, setSkillsGained] = useState(MOCK_DATA.skillsGained);
  const [tags, setTags] = useState(MOCK_DATA.tags);
  const [requiredQualifications, setRequiredQualifications] = useState(
    MOCK_DATA.requiredQualifications,
  );
  const [preferredQualifications, setPreferredQualifications] = useState(
    MOCK_DATA.preferredQualifications,
  );
  const [workLocation, setWorkLocation] = useState(MOCK_DATA.workLocation);
  const [workLocationChangeScope, setWorkLocationChangeScope] = useState(
    MOCK_DATA.workLocationChangeScope,
  );
  const [jobDescriptionChangeScope, setJobDescriptionChangeScope] = useState(
    MOCK_DATA.jobDescriptionChangeScope,
  );
  const [contractType, setContractType] = useState(MOCK_DATA.contractType);
  const [probationPeriod, setProbationPeriod] = useState(
    MOCK_DATA.probationPeriod,
  );
  const [workHours, setWorkHours] = useState(MOCK_DATA.workHours);
  const [breakTime, setBreakTime] = useState(MOCK_DATA.breakTime);
  const [holidays, setHolidays] = useState(MOCK_DATA.holidays);
  const [salaryMin, setSalaryMin] = useState<number | null>(
    MOCK_DATA.salaryMin,
  );
  const [salaryMax, setSalaryMax] = useState<number | null>(
    MOCK_DATA.salaryMax,
  );
  const [salaryDetail, setSalaryDetail] = useState(MOCK_DATA.salaryDetail);
  const [insurance, setInsurance] = useState(MOCK_DATA.insurance);
  const [smokingPolicy, setSmokingPolicy] = useState(MOCK_DATA.smokingPolicy);
  const [benefits, setBenefits] = useState(MOCK_DATA.benefits);
  const [remotePolicy, setRemotePolicy] = useState(MOCK_DATA.remotePolicy);
  const [selectionProcess, setSelectionProcess] = useState(
    MOCK_DATA.selectionProcess,
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );

    for (const section of SECTIONS) {
      const el = sectionRefs.current[section.id];
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    sectionRefs.current[id]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const statusLabel = status === "open" ? "公開中" : "下書き";
  const statusColor =
    status === "open"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/company/jobs"
          className="text-sm text-[#2979ff] hover:underline inline-flex items-center gap-1"
        >
          <svg
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
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">自動保存: 14:32</span>
          <button className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5">
            <svg
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
          <button className="bg-[#2979ff] text-white px-5 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors cursor-pointer">
            保存する
          </button>
        </div>
      </div>

      {/* Title + Status */}
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl font-bold text-gray-900 outline-none border-b-2 border-transparent focus:border-[#2979ff] pb-1 transition-colors bg-transparent"
            placeholder="求人タイトルを入力..."
          />
        </div>
        <button
          onClick={() => setStatus(status === "open" ? "draft" : "open")}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors shrink-0 ${statusColor}`}
        >
          <span
            className={`h-2 w-2 rounded-full ${status === "open" ? "bg-emerald-500" : "bg-amber-500"}`}
          />
          {statusLabel}
        </button>
      </div>

      {/* Main layout: sidebar + content */}
      <div className="flex gap-6 items-start">
        {/* Sidebar nav */}
        <nav className="w-44 shrink-0 sticky top-4">
          <div className="bg-white rounded-xl border border-gray-200 p-2">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                  activeSection === section.id
                    ? "bg-[#2979ff]/10 text-[#2979ff] font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {/* Completion indicator */}
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 mb-2">
              入力状況
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2979ff] rounded-full transition-all duration-500"
                  style={{ width: "85%" }}
                />
              </div>
              <span className="text-xs font-medium text-gray-500">85%</span>
            </div>
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6 pb-20">
          {/* Basic Info */}
          <section
            id="basic"
            ref={(el) => { sectionRefs.current.basic = el; }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <SectionHeading>基本情報</SectionHeading>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel required>職種カテゴリ</FieldLabel>
                  <SelectInput
                    value={jobCategory}
                    options={JOB_CATEGORIES.map((c) => ({
                      value: c,
                      label: c,
                    }))}
                    onChange={setJobCategory}
                  />
                </div>
                <div>
                  <FieldLabel required>雇用形態</FieldLabel>
                  <SelectInput
                    value={employmentType}
                    options={EMPLOYMENT_TYPES}
                    onChange={setEmploymentType}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>採用人数</FieldLabel>
                <TextInput
                  value={hiringCount}
                  placeholder="例: 1〜2名"
                  onChange={setHiringCount}
                />
              </div>
            </div>
          </section>

          {/* Content */}
          <section
            id="content"
            ref={(el) => { sectionRefs.current.content = el; }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <SectionHeading>求人コンテンツ</SectionHeading>
            <div className="space-y-5">
              <div>
                <FieldLabel required>仕事内容</FieldLabel>
                <TextArea
                  value={description}
                  rows={5}
                  placeholder="この求人の仕事内容を記入してください..."
                  onChange={setDescription}
                />
              </div>
              <div>
                <FieldLabel sub="候補者へのアピール">
                  アピールポイント
                </FieldLabel>
                <TextArea
                  value={appealPoints}
                  rows={4}
                  placeholder="この求人の魅力を記入してください..."
                  onChange={setAppealPoints}
                />
              </div>
              <div>
                <FieldLabel sub="やりがいと難しさ">チャレンジ</FieldLabel>
                <TextArea
                  value={challenges}
                  rows={4}
                  placeholder="この仕事で直面するチャレンジを記入してください..."
                  onChange={setChallenges}
                />
              </div>
              <div>
                <FieldLabel>チーム紹介</FieldLabel>
                <TextArea
                  value={teamDescription}
                  rows={4}
                  placeholder="チームの雰囲気やメンバー構成を記入してください..."
                  onChange={setTeamDescription}
                />
              </div>
              <div>
                <FieldLabel sub="この仕事で得られるスキル">
                  身につくスキル
                </FieldLabel>
                <TextArea
                  value={skillsGained}
                  rows={3}
                  placeholder="この求人で身につくスキルを記入してください..."
                  onChange={setSkillsGained}
                />
              </div>

              {/* Content Blocks placeholder */}
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                <div className="text-gray-400 mb-2">
                  <svg
                    className="h-8 w-8 mx-auto"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 font-medium">
                  コンテンツブロック
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  写真やレイアウトを使ったリッチなコンテンツを追加できます
                </p>
                <button className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer">
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  ブロックを追加
                </button>
              </div>
            </div>
          </section>

          {/* Requirements */}
          <section
            id="requirements"
            ref={(el) => { sectionRefs.current.requirements = el; }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <SectionHeading>応募要件</SectionHeading>
            <div className="space-y-4">
              <div>
                <FieldLabel required>必須要件</FieldLabel>
                <TextArea
                  value={requiredQualifications}
                  rows={4}
                  placeholder="必須の資格・経験・スキルを記入してください..."
                  onChange={setRequiredQualifications}
                />
              </div>
              <div>
                <FieldLabel>歓迎要件</FieldLabel>
                <TextArea
                  value={preferredQualifications}
                  rows={4}
                  placeholder="あると望ましい資格・経験・スキルを記入してください..."
                  onChange={setPreferredQualifications}
                />
              </div>
              <div>
                <FieldLabel sub="Enterで追加">タグ</FieldLabel>
                <TagInput
                  tags={tags}
                  onAdd={(tag) => setTags([...tags, tag])}
                  onRemove={(i) => setTags(tags.filter((_, idx) => idx !== i))}
                />
              </div>
            </div>
          </section>

          {/* Conditions */}
          <section
            id="conditions"
            ref={(el) => { sectionRefs.current.conditions = el; }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <SectionHeading>就業条件</SectionHeading>
            <div className="space-y-4">
              <div>
                <FieldLabel required>勤務地</FieldLabel>
                <TextInput
                  value={workLocation}
                  placeholder="例: 東京都渋谷区"
                  onChange={setWorkLocation}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel sub="就業場所の変更の範囲">
                    就業場所の変更範囲
                  </FieldLabel>
                  <TextInput
                    value={workLocationChangeScope}
                    placeholder="例: 当面なし"
                    onChange={setWorkLocationChangeScope}
                  />
                </div>
                <div>
                  <FieldLabel sub="業務内容の変更の範囲">
                    業務内容の変更範囲
                  </FieldLabel>
                  <TextInput
                    value={jobDescriptionChangeScope}
                    placeholder="例: 当面なし"
                    onChange={setJobDescriptionChangeScope}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FieldLabel>契約期間</FieldLabel>
                  <TextInput
                    value={contractType}
                    placeholder="例: 無期"
                    onChange={setContractType}
                  />
                </div>
                <div>
                  <FieldLabel>試用期間</FieldLabel>
                  <TextInput
                    value={probationPeriod}
                    placeholder="例: 入社後3ヶ月"
                    onChange={setProbationPeriod}
                  />
                </div>
              </div>
              <div>
                <FieldLabel>勤務時間</FieldLabel>
                <TextInput
                  value={workHours}
                  placeholder="例: フレックスタイム制"
                  onChange={setWorkHours}
                />
              </div>
              <div>
                <FieldLabel>休憩時間</FieldLabel>
                <TextInput
                  value={breakTime}
                  placeholder="例: 60分"
                  onChange={setBreakTime}
                />
              </div>
              <div>
                <FieldLabel>休日・休暇</FieldLabel>
                <TextArea
                  value={holidays}
                  rows={2}
                  placeholder="休日・休暇の詳細を記入してください..."
                  onChange={setHolidays}
                />
              </div>
            </div>
          </section>

          {/* Compensation */}
          <section
            id="compensation"
            ref={(el) => { sectionRefs.current.compensation = el; }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <SectionHeading>報酬・福利厚生</SectionHeading>
            <div className="space-y-4">
              <div>
                <FieldLabel>年収レンジ</FieldLabel>
                <SalaryRangeInput
                  min={salaryMin}
                  max={salaryMax}
                  onMinChange={setSalaryMin}
                  onMaxChange={setSalaryMax}
                />
              </div>
              <div>
                <FieldLabel sub="固定残業代・手当等の詳細">
                  給与詳細
                </FieldLabel>
                <TextArea
                  value={salaryDetail}
                  rows={2}
                  placeholder="給与の詳細を記入してください..."
                  onChange={setSalaryDetail}
                />
              </div>
              <div>
                <FieldLabel>社会保険</FieldLabel>
                <TextInput
                  value={insurance}
                  placeholder="例: 健康保険、厚生年金、雇用保険、労災保険"
                  onChange={setInsurance}
                />
              </div>
              <div>
                <FieldLabel>リモートワーク</FieldLabel>
                <SelectInput
                  value={remotePolicy}
                  options={[
                    { value: "フルリモート", label: "フルリモート" },
                    {
                      value: "リモート可（週数回出社）",
                      label: "リモート可（週数回出社）",
                    },
                    { value: "原則出社", label: "原則出社" },
                    { value: "フル出社", label: "フル出社" },
                  ]}
                  onChange={setRemotePolicy}
                />
              </div>
              <div>
                <FieldLabel>福利厚生</FieldLabel>
                <TextArea
                  value={benefits}
                  rows={4}
                  placeholder="福利厚生の内容を記入してください..."
                  onChange={setBenefits}
                />
              </div>
              <div>
                <FieldLabel>受動喫煙対策</FieldLabel>
                <SelectInput
                  value={smokingPolicy}
                  options={[
                    {
                      value: "屋内原則禁煙（喫煙専用室あり）",
                      label: "屋内原則禁煙（喫煙専用室あり）",
                    },
                    { value: "屋内全面禁煙", label: "屋内全面禁煙" },
                    {
                      value: "屋内禁煙（屋外に喫煙場所あり）",
                      label: "屋内禁煙（屋外に喫煙場所あり）",
                    },
                    { value: "敷地内全面禁煙", label: "敷地内全面禁煙" },
                  ]}
                  onChange={setSmokingPolicy}
                />
              </div>
            </div>
          </section>

          {/* Selection */}
          <section
            id="selection"
            ref={(el) => { sectionRefs.current.selection = el; }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <SectionHeading>選考・公開</SectionHeading>
            <div className="space-y-4">
              <div>
                <FieldLabel>選考プロセス</FieldLabel>
                <TextArea
                  value={selectionProcess}
                  rows={3}
                  placeholder="選考の流れを記入してください..."
                  onChange={setSelectionProcess}
                />
              </div>
              <div>
                <FieldLabel>公開ステータス</FieldLabel>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 px-4 py-3 border rounded-lg cursor-pointer has-[:checked]:border-[#2979ff] has-[:checked]:bg-blue-50/50 transition-colors">
                    <input
                      type="radio"
                      name="status"
                      value="open"
                      checked={status === "open"}
                      onChange={() => setStatus("open")}
                      className="accent-[#2979ff]"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        公開
                      </div>
                      <div className="text-xs text-gray-500">
                        候補者に表示されます
                      </div>
                    </div>
                  </label>
                  <label className="flex items-center gap-2 px-4 py-3 border rounded-lg cursor-pointer has-[:checked]:border-[#2979ff] has-[:checked]:bg-blue-50/50 transition-colors">
                    <input
                      type="radio"
                      name="status"
                      value="draft"
                      checked={status === "draft"}
                      onChange={() => setStatus("draft")}
                      className="accent-[#2979ff]"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        下書き
                      </div>
                      <div className="text-xs text-gray-500">
                        編集を続けられます
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
