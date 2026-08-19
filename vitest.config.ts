import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
    },
  },
  test: {
    environment: "node",
    include: ["client/**/*.test.ts", "client/**/*.test.tsx"],
  },
});
