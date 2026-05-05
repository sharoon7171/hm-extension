import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const copyManifest = (): Plugin => {
  const source = path.resolve(__dirname, "manifest.json");
  const target = path.resolve(__dirname, "dist/manifest.json");
  return {
    name: "copy-manifest",
    apply: "build",
    buildStart() {
      this.addWatchFile(source);
    },
    closeBundle() {
      fs.copyFileSync(source, target);
    },
  };
};

export default defineConfig({
  base: "./",
  publicDir: false,
  plugins: [react(), copyManifest()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    minify: "terser",
    terserOptions: {
      compress: { drop_console: true },
    },
    rollupOptions: {
      input: {
        options: path.resolve(__dirname, "options.html"),
        background: path.resolve(__dirname, "src/background/index.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name][extname]",
      },
    },
  },
});
