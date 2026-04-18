import type {
  ModelsEducationResponse,
  ModelsExperienceResponse,
  ModelsSkillResponse,
  ModelsUserResponse,
} from "@/external/client/api/generated";

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
};

export function ProfileContent({ user, username, experiences, educations, skills }: Props) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3">
      <ProfileHeaderCard user={user} experienceCount={experiences.length} />
      <AiReportCard
        hasExperience={experiences.length > 0}
        hasSkills={skills.length > 0}
        hasEducation={educations.length > 0}
      />
      <ResumeUploadCard />
      <SkillsCard username={username} skills={skills} />
      <ExperienceCard username={username} experiences={experiences} />
      <EducationCard username={username} educations={educations} />
      <AboutCard user={user} />
      <PostsTabs />
    </div>
  );
}
