export type ScoutStatus =
  | "draft"
  | "sent"
  | "opened"
  | "replied"
  | "interested"
  | "declined"
  | "expired";

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
  level: "good" | "warning" | "temporarily_restricted" | "restricted";
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

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
}

export interface JobPosting {
  id: string;
  companyId: string;
  title: string;
  description: string;
  employmentType: string;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
