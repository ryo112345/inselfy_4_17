import { config } from "dotenv";
import type { NextConfig } from "next";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env") });

const nextConfig: NextConfig = {
  devIndicators: {
    position: "bottom-left",
  },
  output: "standalone",
  images: {
    // Google OAuth のアバター画像（lh3 等のサブドメイン）。アップロード画像は
    // 同一オリジンの /api/uploads/** なので設定不要。
    remotePatterns: [{ protocol: "https", hostname: "*.googleusercontent.com" }],
  },
};

export default nextConfig;
