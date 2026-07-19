// scout のドメイン型は orval 生成モデルの別名。コンポーネント側は短い名前で参照する
import type {
  ModelsScoutCreditsResponse,
  ModelsScoutDashboardResponse,
  ModelsScoutDetailResponse,
  ModelsScoutListResponse,
  ModelsScoutMessageResponse,
  ModelsScoutQualityScoreResponse,
  ModelsScoutReplyResponse,
  ModelsScoutSettingsResponse,
  ModelsScoutStatus,
  ModelsScoutTemplateResponse,
} from "@/external/client/api/orval/generated/models";

export type ScoutStatus = ModelsScoutStatus;
export type ScoutMessage = ModelsScoutMessageResponse;
export type ScoutReply = ModelsScoutReplyResponse;
export type ScoutDetail = ModelsScoutDetailResponse;
export type ScoutListResponse = ModelsScoutListResponse;
export type ScoutCredits = ModelsScoutCreditsResponse;
export type QualityScore = ModelsScoutQualityScoreResponse;
export type ScoutTemplate = ModelsScoutTemplateResponse;
export type ScoutSettings = ModelsScoutSettingsResponse;
export type ScoutDashboard = ModelsScoutDashboardResponse;

export interface JobPosting {
  id: string;
  companyId: string;
  title: string;
  description: string;
  employmentType: string;
  location: string | null;
  isActive: boolean;
  status: string;
  jobCategory: string;
  hiringCount: string;
  appealPoints: string;
  challenges: string;
  teamDescription: string;
  teamMembers: { name: string; photoUrl?: string }[];
  teamLabel: string;
  teamId: string | null;
  skillsGained: string;
  tags: string[];
  requiredQualifications: string;
  preferredQualifications: string;
  workLocation: string;
  workLocationChangeScope: string;
  jobDescriptionChangeScope: string;
  contractType: string;
  probationPeriod: string;
  workHours: string;
  breakTime: string;
  holidays: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryDetail: string;
  insurance: string;
  remotePolicy: string;
  benefits: string;
  smokingPolicy: string;
  selectionProcess: string;
  coverImageUrl: string;
  highlightTitleRole: string;
  highlightTitleAppeal: string;
  highlightTitleChallenge: string;
  highlightTitleGrowth: string;
  galleryUrls: string[];
  createdAt: string;
  updatedAt: string;
}
