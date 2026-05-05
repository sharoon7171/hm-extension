import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  publicDir: false,
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
        background: path.resolve(__dirname, "src/background/index.ts"),
      },
      output: {
        codeSplitting: false,
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name][extname]",
      },
    },
  },
});
