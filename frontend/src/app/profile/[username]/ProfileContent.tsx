import type {
  ModelsEducationResponse,
  ModelsExperienceResponse,
  ModelsSkillResponse,
  ModelsUserResponse,
} from "@/external/client/api/generated";
import type { PostItem } from "@/features/timeline/api";

import { AboutCard } from "./AboutCard";
import { AiReportCard } from "./AiReportCard";
import { EducationCard } from "./EducationCard";
import { ExperienceCard } from "./ExperienceCard";
import { PostsTabs } from "./PostsTabs";
import { ProfileHeaderCard } from "./ProfileHeaderCard";
import { ResumeUploadCard } from "./ResumeUploadCard";
import { SkillsCard } from "./SkillsCard";

type Props = {
  user: ModelsUserResponse;
  username: string;
  experiences: ModelsExperienceResponse[];
  educations: ModelsEducationResponse[];
  skills: ModelsSkillResponse[];
  posts?: PostItem[];
  isOwner?: boolean;
  intReportRequestId?: string | null;
};

export function ProfileContent({ user, username, experiences, educations, skills, posts, isOwner = true, intReportRequestId }: Props) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <ProfileHeaderCard user={user} experienceCount={experiences.length} isOwner={isOwner} />
      {isOwner && (
        <AiReportCard
          hasExperience={experiences.length > 0}
          hasSkills={skills.length > 0}
          hasEducation={educations.length > 0}
          intReportRequestId={intReportRequestId}
        />
      )}
      {isOwner && <ResumeUploadCard />}
      {(isOwner || skills.length > 0) && (
        <SkillsCard username={username} skills={skills} isOwner={isOwner} />
      )}
      {(isOwner || experiences.length > 0) && (
        <ExperienceCard username={username} experiences={experiences} isOwner={isOwner} />
      )}
      {(isOwner || educations.length > 0) && (
        <EducationCard username={username} educations={educations} isOwner={isOwner} />
      )}
      {(isOwner || user.about) && (
        <AboutCard user={user} isOwner={isOwner} />
      )}
      <PostsTabs posts={posts} />
    </div>
  );
}
