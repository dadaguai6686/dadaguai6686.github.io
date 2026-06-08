import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const packageJson = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as {
  version?: string;
};
const buildId = process.env.GITHUB_SHA?.slice(0, 12) ?? process.env.LUMEN_BUILD_ID ?? "local";
const assetVersion = `${packageJson.version ?? "0.0.0"}-${buildId}`;

export default defineConfig({
  base: "./",
  plugins: [
    {
      name: "lumen-asset-version",
      transformIndexHtml(html) {
        return html.replaceAll("%LUMEN_ASSET_VERSION%", assetVersion);
      }
    }
  ],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        assetFileNames: "assets/[name][extname]",
        chunkFileNames: "assets/[name].js",
        entryFileNames: "assets/[name].js",
        manualChunks(id) {
          if (id.includes("node_modules/phaser")) {
            return "phaser";
          }
        }
      }
    }
  },
  server: {
    host: "127.0.0.1",
    port: 5173
  },
  preview: {
    host: "127.0.0.1",
    port: 4173
  }
});
