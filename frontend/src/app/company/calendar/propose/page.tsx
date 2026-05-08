"use client";

import { useSearchParams } from "next/navigation";
import { SlotPicker } from "@/features/interview/components/SlotPicker";

export default function ProposePage() {
  const params = useSearchParams();
  const applicationId = params.get("applicationId") ?? "";
  const candidateName = params.get("candidateName") ?? "";
  const date = params.get("date") ?? undefined;
  const startMinutesRaw = params.get("startMinutes");
  const startMinutes = startMinutesRaw ? Number(startMinutesRaw) : undefined;

  if (!applicationId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-500">応募IDが指定されていません</p>
      </div>
    );
  }

  return (
    <SlotPicker
      applicationId={applicationId}
      candidateName={candidateName}
      initialDate={date}
      initialStartMinutes={startMinutes}
    />
  );
}
