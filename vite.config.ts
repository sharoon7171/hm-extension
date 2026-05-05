import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const rootStaticFiles = ["manifest.json", "options.html"];

const copyRootStatic = (): Plugin => ({
  name: "copy-root-static",
  apply: "build",
  closeBundle() {
    const outDir = path.resolve(__dirname, "dist");
    for (const file of rootStaticFiles) {
      fs.copyFileSync(path.resolve(__dirname, file), path.join(outDir, file));
    }
  },
});

export default defineConfig({
  base: "./",
  publicDir: false,
  plugins: [react(), copyRootStatic()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: path.resolve(__dirname, "src/background/index.ts"),
        content: path.resolve(__dirname, "src/content/index.ts"),
      },
      output: {
        entryFileNames(chunk) {
          if (chunk.name === "background") return "background.js";
          if (chunk.name === "content") return "content.js";
          return "[name]-[hash].js";
        },
        chunkFileNames: "[name]-[hash].js",
        assetFileNames: "[name]-[hash][extname]",
      },
    },
  },
});
