import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores([
    ".next/**",
    "coverage/**",
    "dist/**",
    "node_modules/**",
    "out/**",
    "public/**",
  ]),
  {
    files: ["**/*.{js,mjs,cjs}"],
    rules: {},
  },
]);
