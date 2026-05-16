"use client";

import "@/external/client/api/client";
import {
  educationsCreateEducation,
  educationsDeleteEducation,
  educationsUpdateEducation,
  experiencesCreateExperience,
  experiencesDeleteExperience,
  experiencesUpdateExperience,
  skillsAttachSkill,
  skillsDetachSkill,
  usersUpdateUserProfile,
  type ModelsCreateEducationRequest,
  type ModelsCreateExperienceRequest,
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

export type FollowStatus = {
  following: boolean;
  followedBy: boolean;
};

export async function fetchFollowStatus(username: string): Promise<FollowStatus> {
  const res = await fetch(`/api/users/${username}/follow-status`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch follow status");
  return res.json();
}

export async function followUser(username: string): Promise<void> {
  const res = await fetch(`/api/users/${username}/follow`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to follow");
  }
}

export async function unfollowUser(username: string): Promise<void> {
  const res = await fetch(`/api/users/${username}/follow`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Failed to unfollow");
  }
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
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`/api/users/${username}/upload-image?type=${type}`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { code: "UPLOAD_ERROR", message: err.message ?? "アップロードに失敗しました" };
  }
  return res.json();
}
