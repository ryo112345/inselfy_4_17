"use client";

import type { ZodType } from "zod";
// プロフィール編集（経歴・学歴・スキル・フォロー・画像）の薄いラッパー層。
// 編集モーダルの命令的フローから呼ばれるためシグネチャを維持し、
// 内部だけ orval 生成の平関数に置き換えている。非2xx は mutator が ApiError を throw する。
import {
  educationsCreateEducation,
  educationsDeleteEducation,
  educationsUpdateEducation,
} from "@/external/client/api/orval/generated/endpoints/educations/educations";
import {
  experiencesCreateExperience,
  experiencesDeleteExperience,
  experiencesUpdateExperience,
} from "@/external/client/api/orval/generated/endpoints/experiences/experiences";
import {
  followsFollowUser,
  followsUnfollowUser,
} from "@/external/client/api/orval/generated/endpoints/follows/follows";
import {
  resumesGetMyResume,
  resumesUploadResume,
} from "@/external/client/api/orval/generated/endpoints/resumes/resumes";
import {
  skillsAttachSkill,
  skillsDetachSkill,
} from "@/external/client/api/orval/generated/endpoints/skills/skills";
import {
  usersUpdateUserProfile,
  usersUploadUserImage,
} from "@/external/client/api/orval/generated/endpoints/users/users";
import type {
  ModelsCreateEducationRequest,
  ModelsCreateExperienceRequest,
  ModelsUpdateEducationRequest,
  ModelsUpdateExperienceRequest,
  ModelsUpdateUserProfileRequest,
} from "@/external/client/api/orval/generated/models";
import {
  EducationsCreateEducationBody,
  EducationsUpdateEducationBody,
} from "@/external/client/api/orval/generated/zod/educations/educations.zod";
import {
  ExperiencesCreateExperienceBody,
  ExperiencesUpdateExperienceBody,
} from "@/external/client/api/orval/generated/zod/experiences/experiences.zod";
import { SkillsAttachSkillBody } from "@/external/client/api/orval/generated/zod/skills/skills.zod";
import { UsersUpdateUserProfileBody } from "@/external/client/api/orval/generated/zod/users/users.zod";

import type { FieldErrors } from "@/lib/form-validation";
import { formatFieldErrors, validateForm } from "@/lib/form-validation";

export type { ApiError } from "@/lib/api-result";

// 編集カードが多数（About / Experience / Education / Skills / Header）あるため、
// 送信前の zod 検証はこのラッパー層で一元的に行い、エラーは Error として投げて
// 各カードの既存 catch → setError 表示に載せる。
const profileLabels = {
  username: "ユーザー名",
  name: "名前",
  headline: "ヘッドライン",
  location: "居住地",
  about: "自己紹介",
  industry: "業界",
  jobType: "職種",
  jobSeekingStatus: "求職ステータス",
  profileColor: "プロフィールカラー",
};

const experienceLabels = {
  companyName: "会社名",
  title: "役職",
  startYear: "開始年",
  startMonth: "開始月",
  endYear: "終了年",
  endMonth: "終了月",
  description: "業務内容",
};

const educationLabels = {
  school: "学校名",
  degree: "学部・学科",
  startYear: "入学年",
  endYear: "卒業年",
};

function assertValid(schema: ZodType, body: unknown, labels: Record<string, string>) {
  const fieldErrors: FieldErrors | null = validateForm(schema, body);
  if (fieldErrors) throw new Error(formatFieldErrors(fieldErrors, labels).join("\n"));
}

export async function updateProfile(username: string, body: ModelsUpdateUserProfileRequest) {
  assertValid(UsersUpdateUserProfileBody, body, profileLabels);
  return usersUpdateUserProfile(username, body);
}

export async function createExperience(username: string, body: ModelsCreateExperienceRequest) {
  assertValid(ExperiencesCreateExperienceBody, body, experienceLabels);
  return experiencesCreateExperience(username, body);
}

export async function updateExperience(
  username: string,
  experienceId: string,
  body: ModelsUpdateExperienceRequest,
) {
  assertValid(ExperiencesUpdateExperienceBody, body, experienceLabels);
  return experiencesUpdateExperience(username, experienceId, body);
}

export async function deleteExperience(username: string, experienceId: string) {
  return experiencesDeleteExperience(username, experienceId);
}

export async function createEducation(username: string, body: ModelsCreateEducationRequest) {
  assertValid(EducationsCreateEducationBody, body, educationLabels);
  return educationsCreateEducation(username, body);
}

export async function updateEducation(
  username: string,
  educationId: string,
  body: ModelsUpdateEducationRequest,
) {
  assertValid(EducationsUpdateEducationBody, body, educationLabels);
  return educationsUpdateEducation(username, educationId, body);
}

export async function deleteEducation(username: string, educationId: string) {
  return educationsDeleteEducation(username, educationId);
}

export async function attachSkill(username: string, name: string) {
  assertValid(SkillsAttachSkillBody, { name }, { name: "スキル名" });
  return skillsAttachSkill(username, { name });
}

export async function detachSkill(username: string, name: string) {
  return skillsDetachSkill(username, name);
}

export async function followUser(username: string): Promise<void> {
  await followsFollowUser(username);
}

export async function unfollowUser(username: string): Promise<void> {
  await followsUnfollowUser(username);
}

export type FollowCounts = {
  followersCount: number;
  followingCount: number;
};

export async function uploadProfileImage(
  username: string,
  file: File,
  type: "avatar" | "cover",
): Promise<{ url: string }> {
  return usersUploadUserImage(username, { file }, { type });
}

export type { ModelsResumeUploadItem as ResumeUpload } from "@/external/client/api/orval/generated/models";

export async function uploadResume(file: File) {
  return resumesUploadResume({ file });
}

export async function fetchMyResume() {
  return (await resumesGetMyResume()).upload;
}
