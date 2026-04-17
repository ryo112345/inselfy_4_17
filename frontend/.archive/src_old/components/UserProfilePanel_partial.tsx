// ⚠️ 部分的ファイル: 1-320行目 + 1080-1300行目のみ。321-1079行目と1301-1469行目は欠落。

import { useState, useEffect, useRef } from "react";
import { Camera, MapPin, Plus, Pencil, Briefcase, GraduationCap, Award, ChevronDown, ChevronUp, X, Loader2, Check, Link as LinkIcon, Search as SearchIcon, FileText } from "lucide-react";
import { getUserProfile, updateMyProfile, getIntegratedReport, getIntegratedReportStatus, uploadResume, getResumeStatus, authMe } from "../api";
import type { FullProfile, ExperienceData, EducationData, IntegratedReport, ResumeUploadStatus } from "../api";
import { INDUSTRIES, JOB_TYPES, getIndustryLabel, getJobTypeLabel } from "../masterData";

import { listUserPosts, listUserReplies, listLikedPosts, getFollowStatus, followUser, unfollowUser, listFriends, type Post, type ReplyWithParent } from "../postApi";
import { listUserArticles, listLikedArticles, type ArticleListItem } from "../articleApi";
import PostCard from "./PostCard";

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const JOB_SEEKING_STATUSES = [
  { id: "", label: "未設定" },
  { id: "active", label: "積極的に探している" },
  { id: "open", label: "いい話があれば" },
  { id: "closed", label: "今は考えていない" },
] as const;

function getJobSeekingLabel(id: string): string {
  return JOB_SEEKING_STATUSES.find((s) => s.id === id)?.label ?? "";
}

function getJobSeekingColor(id: string, profileColor: string): { bg: string; fg: string } {
  if (id === "active") return { bg: "#e8f5e9", fg: "#2e7d32" };
  if (id === "open") return { bg: "#fff8e1", fg: "#f57f17" };
  if (id === "closed") return { bg: "#f5f5f5", fg: "#9e9e9e" };
  return { bg: "transparent", fg: "transparent" };
}

const REPORT_SECTIONS = [
  { id: "hidden_axis", label: "キャリアを貫く「見えない軸」" },
  { id: "gap_analysis", label: "今感じている「ズレ」の正体" },
  { id: "skill_scenarios", label: "スキルの活かし方シナリオ" },
  { id: "market_value", label: "「今の自分」の市場価値診断" },
  { id: "decision_pattern", label: "転職・異動の「判断パターン」分析" },
  { id: "another_career", label: "あなたの経歴に隠れた「もう一つのキャリア」" },
  { id: "effortless_strength", label: "頑張らなくても勝てる「得意領域」" },
  { id: "recruiter_focus", label: "採用担当があなたの経歴で最初に注目すること" },
  { id: "self_pr", label: "面接・自己PRで使える「自分の言語化」" },
  { id: "missing_piece", label: "あなたのキャリアに足りない「最後のピース」" },
] as const;

function YearSelect({ value, onChange, placeholder, maxYear }: { value: string; onChange: (v: string) => void; placeholder: string; maxYear?: number }) {
  const max = maxYear ?? currentYear;
  const options = Array.from({ length: max - 1950 + 1 }, (_, i) => max - i);
  return (
    <select className="lp-select lp-input-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((y) => <option key={y} value={String(y)}>{y}年</option>)}
    </select>
  );
}

function MonthSelect({ value, onChange, maxMonth }: { value: string; onChange: (v: string) => void; maxMonth?: number }) {
  const max = maxMonth ?? 12;
  const options = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <select className="lp-select lp-input-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">月</option>
      {options.map((m) => <option key={m} value={String(m)}>{m}月</option>)}
    </select>
  );
}

interface Experience {
  id: string;
  companyName: string;
  title: string;
  startYear: string;
  startMonth: string;
  endYear: string;
  endMonth: string;
  isCurrent: boolean;
  location: string;
  description: string;
}

interface Education {
  id: string;
  school: string;
  degree: string;
  startYear: string;
  endYear: string;
}

interface Skill {
  id: string;
  name: string;
}

interface Props {
  userId: string | null;
  isOwner?: boolean;
  onViewReport?: () => void;
}

function calcDuration(startYear: number, startMonth: number, endYear: number | null, endMonth: number | null, isCurrent: boolean): string {
  const now = new Date();
  const ey = isCurrent || endYear == null ? now.getFullYear() : endYear;
  const em = isCurrent || endMonth == null ? now.getMonth() + 1 : endMonth;
  // 開始=月初、終了=月末なので終了月を+1して差を取る
  const startTotal = startYear * 12 + (startMonth - 1);
  const endTotal = ey * 12 + em; // 月末 = 翌月初と同じ
  const months = Math.max(0, endTotal - startTotal);
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years > 0 && rem > 0) return `${years}年${rem}ヶ月`;
  if (years > 0) return `${years}年`;
  return `${rem}ヶ月`;
}

function calcCompanyDuration(exps: Experience[]): string {
  if (exps.length === 0) return "";
  const now = new Date();
  const intervals = exps.map((e) => {
    const sy = parseInt(e.startYear) || 0;
    const sm = parseInt(e.startMonth) || 1;
    let ey: number, em: number;
    if (e.isCurrent || !e.endYear) {
      ey = now.getFullYear();
      em = now.getMonth() + 1;
    } else {
      ey = parseInt(e.endYear) || 0;
      em = parseInt(e.endMonth) || 1;
    }
    // 開始=月初、終了=月末(+1)
    const s = sy * 12 + (sm - 1);
    const ed = ey * 12 + em;
    return [Math.min(s, ed), Math.max(s, ed)] as [number, number];
  }).sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1];
    if (intervals[i][0] <= last[1]) {
      last[1] = Math.max(last[1], intervals[i][1]);
    } else {
      merged.push(intervals[i]);
    }
  }

  const totalMonths = merged.reduce((sum, [s, e]) => sum + (e - s), 0);
  const years = Math.floor(totalMonths / 12);
  const rem = totalMonths % 12;
  if (years > 0 && rem > 0) return `${years}年${rem}ヶ月`;
  if (years > 0) return `${years}年`;
  return `${rem}ヶ月`;
}

export function UserProfilePanel({ userId, isOwner = false, onViewReport }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [location, setLocation] = useState("");
  const [about, setAbout] = useState("");
  const [age, setAge] = useState("");
  const [industry, setIndustry] = useState("");
  const [jobType, setJobType] = useState("");
  const [url, setUrl] = useState("");
  const [profileColor, setProfileColor] = useState("#3D8B6E");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [jobSeekingStatus, setJobSeekingStatus] = useState("");
  const [newSkill, setNewSkill] = useState("");

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingExpId, setEditingExpId] = useState<string | null>(null);
  const [editingEduId, setEditingEduId] = useState<string | null>(null);

  const [sectionSaving, setSectionSaving] = useState<string | null>(null);
  const [sectionSaved, setSectionSaved] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const emptyExp: Experience = { id: "", companyName: "", title: "", startYear: "", startMonth: "", endYear: "", endMonth: "", isCurrent: false, location: "", description: "" };
  const emptyEdu: Education = { id: "", school: "", degree: "", startYear: "", endYear: "" };

  const [tempExp, setTempExp] = useState<Experience>(emptyExp);
  const [tempEdu, setTempEdu] = useState<Education>(emptyEdu);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  // Integrated Report state
  const [integratedReport, setIntegratedReport] = useState<IntegratedReport | null>(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportDone, setReportDone] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Resume upload state
  const [resumeStatus, setResumeStatus] = useState<ResumeUploadStatus | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  // Follow state
  const [followStatus, setFollowStatus] = useState<{
    following: boolean;
    followed_by: boolean;
    followers: number;
    following_count: number;
  } | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [currentAuthUserId, setCurrentAuthUserId] = useState<string | null>(null);
  const [friendCount, setFriendCount] = useState<number>(0);

  // Posts state
  const [profileTab, setProfileTab] = useState<"posts" | "replies" | "articles" | "likes">("posts");
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReplies, setUserReplies] = useState<ReplyWithParent[]>([]);
  const [userArticles, setUserArticles] = useState<ArticleListItem[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [likedArticles, setLikedArticles] = useState<ArticleListItem[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [likesLoading, setLikesLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // refs で最新の state を保持（saveToDB 内で使う）
  const stateRef = useRef({ headline, location, about, age, industry, jobType, url, profileColor, jobSeekingStatus, experiences, educations, skills });
  stateRef.current = { headline, location, about, age, industry, jobType, url, profileColor, jobSeekingStatus, experiences, educations, skills };

  // Load profile
  useEffect(() => {
    if (!userId) {
      setLoaded(true);
      if (isOwner) setEditingSection("header");
      return;
    }
    (async () => {
      try {
        const p = await getUserProfile(userId);
        setDisplayName(p.display_name || "");
        setHeadline(p.headline || "");
        setLocation(p.location || "");
        setAbout(p.about || "");
        setAge(p.age != null ? String(p.age) : "");
        setIndustry(p.industry || "");
        setJobType(p.job_type || "");
        setUrl(p.url || "");
        setProfileColor(p.profile_color || "#3D8B6E");
        setJobSeekingStatus(p.job_seeking_status || "");
        setExperiences(
          (p.experiences || []).map((e) => ({
            id: e.id || Date.now().toString() + Math.random(),
            companyName: e.company_name,
            title: e.title,
            startYear: String(e.start_year),
            startMonth: String(e.start_month),
            endYear: e.end_year != null ? String(e.end_year) : "",
            endMonth: e.end_month != null ? String(e.end_month) : "",
            isCurrent: e.is_current,
            location: e.location || "",
            description: e.description || "",
          }))
        );
        setEducations(
          (p.educations || []).map((e) => ({
            id: e.id || Date.now().toString() + Math.random(),
            school: e.school,
            degree: e.degree || "",
            startYear: e.start_year != null ? String(e.start_year) : "",
            endYear: e.end_year != null ? String(e.end_year) : "",
          }))
        );
        setSkills((p.skills || []).map((s) => ({ id: s.id, name: s.name })));
        setLoaded(true);
        if (isOwner && !p.display_name && !p.headline) {
          setEditingSection("header");
        }
      } catch {
        if (isOwner) setEditingSection("header");
        setLoaded(true);
      }
    })();
  }, [userId]);

  // Load follow status
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const [fs, authRes, friendsRes] = await Promise.all([
          getFollowStatus(userId),
          authMe().catch(() => ({ user: null })),
          listFriends(userId, 1, 0).catch(() => ({ users: [], total: 0 })),
        ]);
        setFollowStatus(fs);
        setFriendCount(friendsRes.total);
        if ((authRes as any)?.user) {
          setCurrentAuthUserId((authRes as any).user.id);
        }
      } catch { /* ignore */ }
    })();
  }, [userId]);

  const handleFollowToggle = async () => {
    if (!userId || !followStatus || followLoading) return;
    setFollowLoading(true);
    try {
      if (followStatus.following) {
        await unfollowUser(userId);
        setFollowStatus((prev) => prev ? {
          ...prev,
          following: false,
          followers: prev.followers - 1,
        } : prev);
      } else {
        await followUser(userId);
        setFollowStatus((prev) => prev ? {
          ...prev,
          following: true,
          followers: prev.followers + 1,
        } : prev);
      }

// ===== ⚠️ 321-1079行目は読み込んでいないため欠落 =====

// ===== 以下は1080行目から =====

//           </div>
//         ))}
//       </div>
//
//       {skills.length > 10 && (
//         <button className="lp-show-more" onClick={() => setShowAllSkills(!showAllSkills)}>
//           {showAllSkills ? <><ChevronUp size={14} /> 折りたたむ</> : <><ChevronDown size={14} /> {skills.length}件のスキルをすべて表示</>}
//         </button>
//       )}
//     </div>

      /* ===== Row 3: Experience (full width) ===== */
      // <div className="bento-card bento-full">
      //   ... 職歴セクション (1091-1200行目)
      // </div>

      /* ===== Row 5: Education (full width) ===== */
      // <div className="bento-card bento-full">
      //   ... 学歴セクション (1202-1292行目)
      // </div>

      /* ===== About ===== */
      // <div className="bento-card bento-full">
      //   ... 自己紹介セクション (1294行目〜)
      // </div>

// ===== ⚠️ 1301-1469行目は読み込んでいないため欠落 =====
