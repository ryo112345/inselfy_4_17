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
  followsGetFollowStatus,
  followsUnfollowUser,
  skillsAttachSkill,
  skillsDetachSkill,
  usersUpdateUserProfile,
  usersUploadUserImage,
  type ModelsCreateEducationRequest,
  type ModelsCreateExperienceRequest,
  type ModelsFollowStatusResponse,
  type ModelsUpdateEducationRequest,
  type ModelsUpdateExperienceRequest,
  type ModelsUpdateUserProfileRequest,
} from "@/external/client/api/generated";

export type ApiError = {
  code: string;
  message: string;
};

// unwrap extracts a domain error message from a hey-api response, or a generic
// network/deserialization error.
function unwrap(err: unknown): ApiError {
  if (typeof err === "object" && err !== null && "code" in err && "message" in err) {
    return err as ApiError;
  }
  return { code: "UNKNOWN", message: String(err) };
}

async function run<T>(p: Promise<{ data?: T; error?: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw unwrap(error);
  return data as T;
}

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

export type FollowStatus = ModelsFollowStatusResponse;

// 注意: /follow-status は jwtMW 付きで未ログインだと 401 が返る。呼び出し元
// （FollowButton）が isAuthenticated ガードを持ち、未ログインでは呼ばない前提。
export async function fetchFollowStatus(username: string): Promise<FollowStatus> {
  const { data, error } = await followsGetFollowStatus({ path: { username } });
  if (error || !data) throw new Error("Failed to fetch follow status");
  return data;
}

export async function followUser(username: string): Promise<void> {
  const { error } = await followsFollowUser({ path: { username } });
  if (error) throw new Error(error.message ?? "Failed to follow");
}

export async function unfollowUser(username: string): Promise<void> {
  const { error } = await followsUnfollowUser({ path: { username } });
  if (error) throw new Error(error.message ?? "Failed to unfollow");
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
  const { data, error } = await usersUploadUserImage({
    path: { username },
    query: { type },
    body: { file },
  });
  if (error || !data) {
    throw { code: "UPLOAD_ERROR", message: error?.message ?? "アップロードに失敗しました" };
  }
  return data;
}
