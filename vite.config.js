import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

function copyRuntimeAssets() {
  return {
    name: "copy-runtime-assets",
    writeBundle() {
      const source = resolve("assets");
      const target = resolve("dist/assets");
      mkdirSync(target, { recursive: true });
      cpSync(source, target, { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [vue(), copyRuntimeAssets()],
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
