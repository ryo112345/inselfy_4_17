import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { fetchPublicCompanyProfile, fetchPublicTeamScores } from "@/features/company-profile/api";
import { fetchPublicJobPosting } from "@/features/job-posting/api";
import { JobDetailClient } from "./JobDetailClient";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ jobId: string }> };

// generateMetadata とページ本体で同一リクエスト内のフェッチを共有する
const getJob = cache((id: string) => fetchPublicJobPosting(id));
const getCompany = cache((id: string) => fetchPublicCompanyProfile(id));

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { jobId } = await params;
  let job: Awaited<ReturnType<typeof getJob>>;
  try {
    job = await getJob(jobId);
  } catch {
    return {};
  }
  const company = await getCompany(job.companyId);
  const title = company ? `${job.title} | ${company.companyName}` : `${job.title} | inselfy`;
  const description = job.description?.slice(0, 120);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(job.coverImageUrl ? { images: [job.coverImageUrl] } : {}),
    },
  };
}

export default async function JobDetailPage({ params }: Params) {
  const { jobId } = await params;
  let job: Awaited<ReturnType<typeof getJob>>;
  try {
    job = await getJob(jobId);
  } catch {
    notFound();
  }
  const [company, teams] = await Promise.all([
    getCompany(job.companyId),
    job.teamId ? fetchPublicTeamScores(job.companyId) : Promise.resolve([]),
  ]);
  const team = job.teamId ? teams.find((t) => t.teamId === job.teamId) : undefined;
  return (
    <JobDetailClient
      job={job}
      company={company}
      teamWVScores={team?.wvScores ?? null}
      teamCIScores={team?.ciScores ?? null}
    />
  );
}
