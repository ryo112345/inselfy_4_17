import { CompanyAuthProvider } from "@/features/company-auth/company-auth-context";
import { CompanyHeader } from "./CompanyHeader";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CompanyAuthProvider>
      <div className="min-h-screen bg-gray-50">
        <CompanyHeader>{children}</CompanyHeader>
      </div>
    </CompanyAuthProvider>
  );
}
