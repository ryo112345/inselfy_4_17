import type {
  ModelsInterviewSlotStatus,
  ModelsInterviewStatus,
} from "@/external/client/api/orval/generated/models";

export interface InterviewSlot {
  id: string;
  startTime: string;
  endTime: string;
  status: ModelsInterviewSlotStatus;
}

export interface InterviewProposal {
  id: string;
  companyName: string;
  jobTitle: string;
  message: string;
  durationMinutes: number;
  slots: InterviewSlot[];
  expiresAt: string;
  createdAt: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  startTime: string;
  endTime: string;
  location: string;
  meetingUrl: string;
  status: ModelsInterviewStatus;
  title: string;
  candidateName?: string;
  candidateAvatarUrl?: string;
  companyName?: string;
  jobTitle?: string;
}

export interface CompanyInterviewsResponse {
  items: Interview[];
}

export interface CandidateInterviewsResponse {
  interviews: Interview[];
  pendingProposals: InterviewProposal[];
}
