import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    {
      name: "spa-fallback",
      configureServer(server) {
        return () => {
          server.middlewares.use((req, _res, next) => {
            if (
              (req.url?.startsWith("/work_values") || req.url?.startsWith("/holland") || req.url?.startsWith("/career_interest") || req.url?.startsWith("/auth/callback") || req.url?.startsWith("/your_career") || req.url?.startsWith("/profile/") || req.url?.startsWith("/admin") || req.url?.startsWith("/company") || req.url?.startsWith("/invite") || req.url?.startsWith("/articles") || req.url?.startsWith("/messages") || req.url?.startsWith("/scouts") || /^\/[a-zA-Z0-9_]{3,20}$/.test(req.url ?? "")) &&
              !req.url.includes(".")
            ) {
              req.url = "/index.html";
            }
            next();
          });
        };
      },
    },
  ],
  server: {
    host: true,
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        timeout: 360000,
        ws: true,
      },
    },
  },
});
