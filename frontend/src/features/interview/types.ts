export interface InterviewSlot {
  id: string;
  startTime: string;
  endTime: string;
  status: "proposed" | "selected" | "rejected";
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
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  title: string;
  candidateName?: string;
  candidateAvatarUrl?: string;
  companyName?: string;
  jobTitle?: string;
}

export interface CompanyInterviewsResponse {
  interviews: Interview[];
}

export interface CandidateInterviewsResponse {
  interviews: Interview[];
  pendingProposals: InterviewProposal[];
}
