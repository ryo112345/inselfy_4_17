import { useEffect, useState } from "react";
import { useCompanyAuth } from "@/features/company-auth/company-auth-context";

export type CompanyProfile = {
  id: string;
  companyName: string;
  industry: string;
  location: string;
  employeeCount: string;
  logoUrl: string;
  benefits: string[];
  smokingPolicy: string;
  galleryUrls: string[];
};

/** 求人フォーム系ページ共通の企業プロフィール取得 */
export function useCompanyProfile(): CompanyProfile | null {
  const { companyFetch } = useCompanyAuth();
  const [company, setCompany] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    companyFetch("/api/company/profile").then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        if (!Array.isArray(data.benefits)) data.benefits = [];
        setCompany({
          id: data.id,
          companyName: data.companyName,
          industry: data.industry,
          location: data.location,
          employeeCount: data.employeeCount,
          logoUrl: data.logoUrl,
          benefits: data.benefits ?? [],
          smokingPolicy: data.smokingPolicy ?? "",
          galleryUrls: data.galleryUrls ?? [],
        });
      }
    });
  }, [companyFetch]);

  return company;
}
