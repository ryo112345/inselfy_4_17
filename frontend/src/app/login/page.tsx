"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";

const GoogleLogin = dynamic(() => import("@react-oauth/google").then((mod) => mod.GoogleLogin), {
  ssr: false,
});

function LoginContent() {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirect || "/");
    }
  }, [isAuthenticated, router, redirect]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-8 shadow-sm">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">inselfy</h1>
          <p className="mt-2 text-sm text-gray-600">価値観に寄り添う逆求人プラットフォーム</p>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={async (response) => {
              if (!response.credential) {
                setError("Google認証に失敗しました");
                return;
              }
              try {
                const user = await login(response.credential);
                router.push(user.needsSetup ? "/setup" : redirect || "/");
              } catch {
                setError("ログインに失敗しました");
              }
            }}
            onError={() => setError("Google認証に失敗しました")}
            text="continue_with"
            shape="rectangular"
            size="large"
            width={300}
          />
        </div>

        <p className="text-center text-xs text-gray-500">
          アカウントをお持ちでない場合も、こちらから新規登録できます
        </p>

        {error && <p className="text-center text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
