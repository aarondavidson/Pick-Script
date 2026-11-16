import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "packages/engine/dist", "test-results", "playwright-report"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // These files export a component together with its hook / variants on
    // purpose (shadcn primitives, context provider + `useX`). The rule only
    // protects dev-server fast refresh, which is not worth splitting them for.
    files: [
      "src/components/ui/**",
      "src/contexts/**",
      "src/engine/AdventureProvider.tsx",
      "src/studio/PackItemsPanel.tsx",
      "src/studio/PackPreview.tsx",
    ],
    rules: { "react-refresh/only-export-components": "off" },
  },
);
