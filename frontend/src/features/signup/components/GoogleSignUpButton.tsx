"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/features/auth/auth-context";

const GoogleLogin = dynamic(() => import("@react-oauth/google").then((mod) => mod.GoogleLogin), {
  ssr: false,
});

export function GoogleSignUpButton() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-2">
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
            setError("登録に失敗しました");
          }
        }}
        onError={() => setError("Google認証に失敗しました")}
        text="signup_with"
        shape="rectangular"
        size="large"
        width={350}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
