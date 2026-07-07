"use client";

import { createContext, useContext } from "react";
import { ACCENT } from "@/constants/theme";

export const ProfileColorContext = createContext(ACCENT);

export function useProfileColor() {
  return useContext(ProfileColorContext);
}
