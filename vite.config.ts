/// <reference types="vitest/config" />
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": resolve(import.meta.dirname, "src"),
      },
    },
    // Dev: proxy to API host if set. Prod: infra handles routing.
    ...(env.VITE_API_HOST && { server: { proxy: { "/api": env.VITE_API_HOST } } }),
    test: {
      environment: "jsdom",
      globals: true,
    },
  };
});
