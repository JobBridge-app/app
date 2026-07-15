import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    root: fileURLToPath(new URL("../../../..", import.meta.url)),
    plugins: [tsconfigPaths()],
    test: {
        environment: "node",
        include: ["src/app/app-home/offers/__tests__/**/*.test.ts"],
    },
});
