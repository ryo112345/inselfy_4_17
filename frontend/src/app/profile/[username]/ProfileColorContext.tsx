"use client";

import { createContext, useContext } from "react";

export const ProfileColorContext = createContext("#3D8B6E");

export function useProfileColor() {
  return useContext(ProfileColorContext);
}
