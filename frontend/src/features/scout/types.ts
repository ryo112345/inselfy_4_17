import type {
  ModelsScoutQualityLevel,
  ModelsScoutStatus,
} from "@/external/client/api/generated";

export type ScoutStatus = ModelsScoutStatus;

export interface ScoutMessage {
  id: string;
  companyId: string;
  candidateId: string;
  jobPostingId: string | null;
  subject: string;
  body: string;
  status: ScoutStatus;
  companyName: string;
  candidateName: string;
  jobTitle: string | null;
  sentAt: string | null;
  openedAt: string | null;
  repliedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface ScoutReply {
  id: string;
  senderType: "candidate" | "company";
  senderId: string;
  body: string;
  createdAt: string;
}

export interface ScoutDetail {
  message: ScoutMessage;
  replies: ScoutReply[];
}

export interface ScoutListResponse {
  items: ScoutMessage[];
  total: number;
}

export interface ScoutCredits {
  balance: number;
  monthlyAllowance: number;
  maxStock: number;
  lastReplenishedAt: string;
}

export interface QualityScore {
  replyRate14d: number;
  level: ModelsScoutQualityLevel;
  sentLast14d: number;
  repliedLast14d: number;
  daysRemaining?: number;
  restrictionEndsAt?: string;
}

export interface ScoutTemplate {
  id: string;
  companyId: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScoutSettings {
  acceptingScouts: boolean;
  updatedAt: string;
}

export interface ScoutDashboard {
  credits: {
    balance: number;
    maxStock: number;
    monthlyAllowance: number;
    nextReplenishDate: string;
  };
  pending: {
    total: number;
    byMonth: {
      month: string;
      count: number;
      daysLeft: number;
    }[];
  };
  replyRate: number;
  avgReplyDays: number;
  sentLast90d: number;
}

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
