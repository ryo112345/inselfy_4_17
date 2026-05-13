"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/features/auth/auth-context";

const GoogleLogin = dynamic(
  () => import("@react-oauth/google").then((mod) => mod.GoogleLogin),
  { ssr: false },
);

export function LandingPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Left: Brand */}
      <div className="flex flex-1 items-center justify-center bg-[#111111] px-8 py-16 lg:py-0">
        <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
          inselfy
        </h1>
      </div>

      {/* Right: Auth */}
      <div className="flex flex-1 items-center justify-center bg-white px-8 py-16 lg:py-0">
        <div className="w-full max-w-[380px] space-y-10">
          <div className="space-y-3">
            <h2 className="text-[28px] font-extrabold leading-tight text-gray-900 sm:text-[32px]">
              いま、何が起きている？
            </h2>
            <p className="text-lg font-bold text-gray-900">
              今すぐ参加しよう。
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={async (response) => {
                  if (!response.credential) {
                    setError("Google認証に失敗しました");
                    return;
                  }
                  try {
                    const user = await login(response.credential);
                    router.push(user.needsSetup ? "/setup" : "/");
                  } catch {
                    setError("ログインに失敗しました");
                  }
                }}
                onError={() => setError("Google認証に失敗しました")}
                text="continue_with"
                shape="pill"
                size="large"
                width={300}
              />
            </div>

            <p className="text-[11px] leading-relaxed text-gray-500">
              登録することにより、
              <a href="/terms" className="text-[var(--accent)] hover:underline">
                利用規約
              </a>
              と
              <a
                href="/privacy"
                className="text-[var(--accent)] hover:underline"
              >
                プライバシーポリシー
              </a>
              に同意したものとみなされます。
            </p>

            {error && (
              <p className="text-center text-sm text-red-600">{error}</p>
            )}
          </div>

          <div className="space-y-4 border-t border-gray-200 pt-8">
            <p className="text-base font-bold text-gray-900">
              アカウントをお持ちの方
            </p>
            <a
              href="/login"
              className="block w-full rounded-full border border-gray-300 py-2.5 text-center text-[15px] font-bold text-[var(--accent)] transition-colors hover:bg-[var(--accent-light)]"
            >
              ログイン
            </a>
          </div>
        </div>
      </div>

      {/* Footer links */}
      <nav className="absolute bottom-0 left-0 right-0 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-white px-4 py-3 text-[12px] text-gray-500 lg:bg-transparent">
        <a href="/terms" className="hover:underline">
          利用規約
        </a>
        <a href="/privacy" className="hover:underline">
          プライバシーポリシー
        </a>
        <span>&copy; 2025 inselfy</span>
      </nav>
    </div>
  );
}
