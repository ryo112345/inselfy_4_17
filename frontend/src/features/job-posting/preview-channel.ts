export const JOB_PREVIEW_CHANNEL = "company-job-preview";

export type JobFormPreviewPayload = {
  title: string;
  jobCategory: string;
  employmentType: string;
  hiringCount: string;
  description: string;
  appealPoints: string;
  challenges: string;
  teamDescription: string;
  teamMembers: { name: string; photoUrl?: string }[];
  teamLabel: string;
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
  highlightTitleRole: string;
  highlightTitleAppeal: string;
  highlightTitleChallenge: string;
  highlightTitleGrowth: string;
  coverImageDataUrl: string | null;
};

// プレビュータブが「現在の状態を送って」と要求するためのメッセージ。
// プレビューはエディタのブロードキャストに後から接続するので、最初の状態だけは
// この pull 要求で取り戻す必要がある。
export type JobPreviewMessage =
  | { type: "data"; payload: JobFormPreviewPayload }
  | { type: "request" };
