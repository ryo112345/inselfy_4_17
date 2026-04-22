"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCompanyAuth } from "@/features/company-auth/company-auth-context";
import { CompanyHeader } from "./CompanyHeader";

const publicPaths = ["/company/login", "/company/register"];

export function CompanyAuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useCompanyAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isPublicPage = publicPaths.includes(pathname);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isPublicPage) {
      router.replace("/company/login");
    }
  }, [isLoading, isAuthenticated, isPublicPage, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-sm text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (isPublicPage) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyHeader>{children}</CompanyHeader>
    </div>
  );
}
