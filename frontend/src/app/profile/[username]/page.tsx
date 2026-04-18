import { notFound } from "next/navigation";

import "@/external/client/api/client";
import {
  educationsListEducations,
  experiencesListExperiences,
  skillsListSkills,
  usersGetUserByUsername,
  type ModelsEducationResponse,
  type ModelsExperienceResponse,
  type ModelsSkillResponse,
  type ModelsUserResponse,
} from "@/external/client/api/generated";
import { getLatestResult as getLatestWvResult } from "@/features/work-values/api";
import { getLatestResult as getLatestCiResult } from "@/features/career-interest/api";

import { AboutCard } from "./AboutCard";
import { AiReportCard } from "./AiReportCard";
import { EducationCard } from "./EducationCard";
import { ExperienceCard } from "./ExperienceCard";
import { PanelNavigator } from "./PanelNavigator";
import { PostsTabs } from "./PostsTabs";
import { ProfileColorContext } from "./ProfileColorContext";
import { ProfileHeaderCard } from "./ProfileHeaderCard";
import { ResumeUploadCard } from "./ResumeUploadCard";
import { SkillsCard } from "./SkillsCard";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const userRes = await usersGetUserByUsername({ path: { username } });
  if (userRes.error || !userRes.data) notFound();
  const user = userRes.data as unknown as ModelsUserResponse;

  const [experiencesRes, educationsRes, skillsRes, wvResult, ciResult] = await Promise.all([
    experiencesListExperiences({ path: { username } }),
    educationsListEducations({ path: { username } }),
    skillsListSkills({ path: { username } }),
    getLatestWvResult(user.id).catch(() => null),
    getLatestCiResult(user.id).catch(() => null),
  ]);

  const experiences: ModelsExperienceResponse[] =
    (experiencesRes.data as unknown as { items?: ModelsExperienceResponse[] } | undefined)
      ?.items ?? [];
  const educations: ModelsEducationResponse[] =
    (educationsRes.data as unknown as { items?: ModelsEducationResponse[] } | undefined)
      ?.items ?? [];
  const skills: ModelsSkillResponse[] =
    (skillsRes.data as unknown as { items?: ModelsSkillResponse[] } | undefined)?.items ?? [];

  const profileColor = user.profileColor ?? "#3D8B6E";

  return (
    <ProfileColorContext value={profileColor}>
      <main className="min-h-screen overflow-x-clip bg-[#f6f7f5] pt-2 pb-8">
        <PanelNavigator
          username={username}
          wvSessionId={wvResult?.session_id ?? null}
          ciSessionId={ciResult?.session_id ?? null}
        >
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
        </PanelNavigator>
      </main>
    </ProfileColorContext>
  );
}
