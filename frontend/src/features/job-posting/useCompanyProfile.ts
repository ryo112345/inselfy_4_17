import { useEffect, useState } from "react";
import { companyProfilesGetCompanyProfile } from "@/external/client/api/orval/generated/endpoints/company-profile/company-profile";

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
  const [company, setCompany] = useState<CompanyProfile | null>(null);

  useEffect(() => {
    companyProfilesGetCompanyProfile()
      .then((data) => {
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
      })
      .catch(() => {});
  }, []);

  return company;
}
