import { CompanyAuthProvider } from "@/features/company-auth/company-auth-context";
import { CompanyAuthGuard } from "./CompanyAuthGuard";

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return (
    <CompanyAuthProvider>
      <CompanyAuthGuard>{children}</CompanyAuthGuard>
    </CompanyAuthProvider>
  );
}
