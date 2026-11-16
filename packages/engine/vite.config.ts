import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import dts from "vite-plugin-dts";
import path from "node:path";
import { readFileSync } from "node:fs";

const root = path.resolve(import.meta.dirname, "../..");
const rootPkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

/** Everything the app depends on stays a real dependency of the package. */
const external = [
  "react",
  "react-dom",
  ...Object.keys(rootPkg.dependencies ?? {}),
];

export default defineConfig({
  root,
  publicDir: false,
  plugins: [
    react(),
    dts({
      tsconfigPath: path.join(root, "tsconfig.app.json"),
      entryRoot: root,
      outDir: path.join(import.meta.dirname, "dist/types"),
      include: [path.join(root, "src"), path.join(import.meta.dirname, "src")],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        // App-only code — not part of the package surface
        path.join(root, "src/games/**"),
        path.join(root, "src/pages/**"),
        path.join(root, "src/App.tsx"),
        path.join(root, "src/main.tsx"),
      ],
    }),
  ],
  resolve: {
    alias: { "@": path.join(root, "src") },
  },
  build: {
    outDir: path.join(import.meta.dirname, "dist"),
    emptyOutDir: true,
    sourcemap: true,
    cssCodeSplit: false,
    lib: {
      entry: path.join(import.meta.dirname, "src/index.ts"),
      formats: ["es"],
      fileName: () => "index.js",
      cssFileName: "style",
    },
    rollupOptions: {
      external: (id) =>
        external.some((dep) => id === dep || id.startsWith(`${dep}/`)),
    },
  },
});
