import { Suspense } from "react";

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
