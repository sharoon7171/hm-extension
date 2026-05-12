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
    chunkSizeWarningLimit: 1200,
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        sequences: false,
        join_vars: false,
      },
    },
    rollupOptions: {
      input: {
        content: path.resolve(__dirname, "src/content/index.ts"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name][extname]",
      },
    },
  },
});
