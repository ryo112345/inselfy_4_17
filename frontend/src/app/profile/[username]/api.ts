"use client";

import "@/external/client/api/client";
import {
  educationsCreateEducation,
  educationsDeleteEducation,
  educationsUpdateEducation,
  experiencesCreateExperience,
  experiencesDeleteExperience,
  experiencesUpdateExperience,
  followsFollowUser,
  followsUnfollowUser,
  type ModelsCreateEducationRequest,
  type ModelsCreateExperienceRequest,
  type ModelsUpdateEducationRequest,
  type ModelsUpdateExperienceRequest,
  type ModelsUpdateUserProfileRequest,
  skillsAttachSkill,
  skillsDetachSkill,
  usersUpdateUserProfile,
  usersUploadUserImage,
} from "@/external/client/api/generated";
import { run } from "@/lib/api-result";

export type { ApiError } from "@/lib/api-result";

export async function updateProfile(username: string, body: ModelsUpdateUserProfileRequest) {
  return run(usersUpdateUserProfile({ path: { username }, body }));
}

export async function createExperience(username: string, body: ModelsCreateExperienceRequest) {
  return run(experiencesCreateExperience({ path: { username }, body }));
}

export async function updateExperience(
  username: string,
  experienceId: string,
  body: ModelsUpdateExperienceRequest,
) {
  return run(experiencesUpdateExperience({ path: { username, experienceId }, body }));
}

export async function deleteExperience(username: string, experienceId: string) {
  return run(experiencesDeleteExperience({ path: { username, experienceId } }));
}

export async function createEducation(username: string, body: ModelsCreateEducationRequest) {
  return run(educationsCreateEducation({ path: { username }, body }));
}

export async function updateEducation(
  username: string,
  educationId: string,
  body: ModelsUpdateEducationRequest,
) {
  return run(educationsUpdateEducation({ path: { username, educationId }, body }));
}

export async function deleteEducation(username: string, educationId: string) {
  return run(educationsDeleteEducation({ path: { username, educationId } }));
}

export async function attachSkill(username: string, name: string) {
  return run(skillsAttachSkill({ path: { username }, body: { name } }));
}

export async function detachSkill(username: string, name: string) {
  return run(skillsDetachSkill({ path: { username, name } }));
}

export async function followUser(username: string): Promise<void> {
  await run(followsFollowUser({ path: { username } }), "Failed to follow");
}

export async function unfollowUser(username: string): Promise<void> {
  await run(followsUnfollowUser({ path: { username } }), "Failed to unfollow");
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
  return run(
    usersUploadUserImage({
      path: { username },
      query: { type },
      body: { file },
    }),
    "アップロードに失敗しました",
  );
}
