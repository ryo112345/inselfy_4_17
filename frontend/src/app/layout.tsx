import type { Metadata } from "next";
import { Noto_Sans_JP, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/features/auth/auth-context";
import { GoogleProvider } from "@/features/auth/google-provider";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-plus-jakarta-sans", display: "swap" });

export const metadata: Metadata = {
  title: "inselfy",
  description: "価値観に寄り添う逆求人プラットフォーム",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${notoSansJp.variable} ${plusJakartaSans.variable}`}>
      <body className="antialiased">
        <script
          dangerouslySetInnerHTML={{ __html: 'window.addEventListener("pageshow",function(e){if(e.persisted)location.reload()});window.addEventListener("pageshow",function(){var n=performance.getEntriesByType("navigation")[0];if(n&&n.type==="back_forward")location.reload()})' }}
        />
        <GoogleProvider>
          <AuthProvider>{children}</AuthProvider>
        </GoogleProvider>
      </body>
    </html>
  );
}
