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

import { AboutCard } from "./AboutCard";
import { AiReportCard } from "./AiReportCard";
import { EducationCard } from "./EducationCard";
import { ExperienceCard } from "./ExperienceCard";
import { PostsTabs } from "./PostsTabs";
import { ProfileHeaderCard } from "./ProfileHeaderCard";
import { ResumeUploadCard } from "./ResumeUploadCard";
import { SkillsCard } from "./SkillsCard";

// Fetched fresh on every visit so the view reflects edits immediately after
// a mutation triggers router.refresh().
export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const userRes = await usersGetUserByUsername({ path: { username } });
  if (userRes.error || !userRes.data) notFound();
  // @hey-api/client-fetch's response generic over-unwraps our typed
  // ModelsUserResponse, so cast via unknown. Same pattern applies to all list
  // responses below.
  const user = userRes.data as unknown as ModelsUserResponse;

  const [experiencesRes, educationsRes, skillsRes] = await Promise.all([
    experiencesListExperiences({ path: { username } }),
    educationsListEducations({ path: { username } }),
    skillsListSkills({ path: { username } }),
  ]);

  const experiences: ModelsExperienceResponse[] =
    (experiencesRes.data as unknown as { items?: ModelsExperienceResponse[] } | undefined)
      ?.items ?? [];
  const educations: ModelsEducationResponse[] =
    (educationsRes.data as unknown as { items?: ModelsEducationResponse[] } | undefined)
      ?.items ?? [];
  const skills: ModelsSkillResponse[] =
    (skillsRes.data as unknown as { items?: ModelsSkillResponse[] } | undefined)?.items ?? [];

  return (
    <main className="min-h-screen bg-[#f6f7f5] px-4 py-8">
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
    </main>
  );
}
