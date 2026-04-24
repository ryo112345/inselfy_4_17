import { config } from "dotenv";
import { resolve } from "path";
import type { NextConfig } from "next";

config({ path: resolve(__dirname, "../.env") });

const nextConfig: NextConfig = {
  devIndicators: {
    position: "bottom-left",
  },
  output: "standalone",
};

export default nextConfig;
