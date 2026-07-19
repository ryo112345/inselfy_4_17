import type { Metadata } from "next";
import { Noto_Sans_JP, Plus_Jakarta_Sans } from "next/font/google";
import { MobileFooter } from "@/app/components/MobileFooter";
import { QueryProvider } from "@/app/components/QueryProvider";
import { ConfirmDialogProvider, ToastProvider } from "@/components/ui";
import { AuthProvider } from "@/features/auth/auth-context";
import { GoogleProvider } from "@/features/auth/google-provider";
import { getViewer } from "@/features/auth/viewer";
import { UnreadMessagingProvider } from "@/features/messaging/unread-context";
import { UnreadScoutProvider } from "@/features/scout/unread-context";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "inselfy",
  description: "価値観に寄り添う逆求人プラットフォーム",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // 閲覧者をサーバー側で解決して注入し、クライアント初回の /api/auth/me
  // ウォーターフォールを省略する（未解決時は null → 従来のクライアントフロー）
  const initialUser = await getViewer();
  return (
    <html lang="ja" className={`${notoSansJp.variable} ${plusJakartaSans.variable}`}>
      <body className="antialiased">
        <QueryProvider>
          <GoogleProvider>
            <AuthProvider initialUser={initialUser}>
              <UnreadScoutProvider>
                <UnreadMessagingProvider>
                  <ToastProvider>
                    <ConfirmDialogProvider>
                      {children}
                      <MobileFooter />
                    </ConfirmDialogProvider>
                  </ToastProvider>
                </UnreadMessagingProvider>
              </UnreadScoutProvider>
            </AuthProvider>
          </GoogleProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
