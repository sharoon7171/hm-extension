import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const STATIC_FILES = ["manifest.json", "block-rules.json"] as const;

const copyStaticFiles = (): Plugin => {
  const pairs = STATIC_FILES.map(name => ({
    source: path.resolve(__dirname, name),
    target: path.resolve(__dirname, "dist", name),
  }));
  return {
    name: "copy-static-files",
    apply: "build",
    buildStart() {
      for (const { source } of pairs) this.addWatchFile(source);
    },
    closeBundle() {
      for (const { source, target } of pairs) fs.copyFileSync(source, target);
    },
  };
};

export default defineConfig({
  base: "./",
  publicDir: false,
  plugins: [react(), copyStaticFiles()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    cssCodeSplit: false,
    minify: "terser",
    terserOptions: {
      compress: { drop_console: true },
    },
    rollupOptions: {
      input: {
        options: path.resolve(__dirname, "options.html"),
      },
      output: {
        codeSplitting: false,
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: (asset) => {
          const name = asset.names[0] ?? "asset";
          return name.endsWith(".css") ? "options.css" : "[name][extname]";
        },
      },
    },
  },
});
