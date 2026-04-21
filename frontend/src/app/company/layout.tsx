import { CompanyHeader } from "./CompanyHeader";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <CompanyHeader>{children}</CompanyHeader>
    </div>
  );
}
