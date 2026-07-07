import { config } from "dotenv";
import type { NextConfig } from "next";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env") });

const nextConfig: NextConfig = {
  devIndicators: {
    position: "bottom-left",
  },
  output: "standalone",
};

export default nextConfig;
