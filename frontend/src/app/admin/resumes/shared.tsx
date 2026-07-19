// 一覧・ドラフト詳細ページで共有する型と部品（page.tsx は Next.js の
// 予約 export 以外を持てないためここに置く）

import { adminFetch } from "@/features/admin/api";

export interface AdminResume {
  id: string;
  userId: string;
  userName: string;
  username: string;
  originalFilename: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function resumeStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-50 px-2.5 py-0.5 text-xs font-medium text-yellow-800 border border-yellow-200">
          未処理
        </span>
      );
    case "reviewing":
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-800 border border-blue-200">
          確認中
        </span>
      );
    case "approved":
      return (
        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-800 border border-green-200">
          反映済み
        </span>
      );
    case "rejected":
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-800 border border-red-200">
          却下
        </span>
      );
    default:
      return null;
  }
}

/** PDF を X-Admin-Key 付き fetch で取得して blob 保存する */
export async function downloadResumePdf(resumeId: string, filename: string): Promise<boolean> {
  const res = await adminFetch(`/api/admin/resumes/${resumeId}/download`);
  if (!res.ok) return false;
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "resume.pdf";
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
