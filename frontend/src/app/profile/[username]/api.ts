"use client";

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

export type { ApiError } from "@/lib/api-result";

export async function updateProfile(username: string, body: ModelsUpdateUserProfileRequest) {
  return usersUpdateUserProfile(username, body);
}

export async function createExperience(username: string, body: ModelsCreateExperienceRequest) {
  return experiencesCreateExperience(username, body);
}

export async function updateExperience(
  username: string,
  experienceId: string,
  body: ModelsUpdateExperienceRequest,
) {
  return experiencesUpdateExperience(username, experienceId, body);
}

export async function deleteExperience(username: string, experienceId: string) {
  return experiencesDeleteExperience(username, experienceId);
}

export async function createEducation(username: string, body: ModelsCreateEducationRequest) {
  return educationsCreateEducation(username, body);
}

export async function updateEducation(
  username: string,
  educationId: string,
  body: ModelsUpdateEducationRequest,
) {
  return educationsUpdateEducation(username, educationId, body);
}

export async function deleteEducation(username: string, educationId: string) {
  return educationsDeleteEducation(username, educationId);
}

export async function attachSkill(username: string, name: string) {
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
