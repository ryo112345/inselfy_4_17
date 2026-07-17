import type {
  ModelsEducationResponse,
  ModelsExperienceResponse,
  ModelsSkillResponse,
  ModelsUserResponse,
} from "@/external/client/api/orval/generated/models";
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
  // 「省略＝オーナー扱い」の事故を防ぐため必須（F22）
  isOwner: boolean;
  intReportRequestId?: string | null;
  intReportHasReport?: boolean;
  initialFollowing?: boolean | null;
  followersCount?: number;
  followingCount?: number;
};

export function ProfileContent({
  user,
  username,
  experiences,
  educations,
  skills,
  posts,
  isOwner,
  intReportRequestId,
  intReportHasReport,
  initialFollowing = null,
  followersCount = 0,
  followingCount = 0,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-3 md:px-0">
      <ProfileHeaderCard
        user={user}
        followersCount={followersCount}
        followingCount={followingCount}
        isOwner={isOwner}
        initialFollowing={initialFollowing}
      />
      {isOwner && (
        <AiReportCard
          hasExperience={experiences.length > 0}
          hasSkills={skills.length > 0}
          hasEducation={educations.length > 0}
          intReportRequestId={intReportRequestId}
          intReportHasReport={intReportHasReport}
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
      {(isOwner || user.about) && <AboutCard user={user} isOwner={isOwner} />}
      <PostsTabs posts={posts} userId={user.id} />
    </div>
  );
}
