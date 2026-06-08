import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const distRoot = "dist";
const indexPath = join(distRoot, "index.html");
const sourceIndexPath = "index.html";

assert.ok(existsSync(indexPath), "dist/index.html should exist after npm run build");

const html = readFileSync(indexPath, "utf8");
const sourceHtml = readFileSync(sourceIndexPath, "utf8");
const assetRefs = Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g))
  .map((match) => match[1])
  .filter((ref) => ref.startsWith("/assets/") || ref.startsWith("./assets/") || ref.startsWith("assets/"));

assert.ok(assetRefs.length > 0, "dist/index.html should reference built assets");
assert.ok(
  assetRefs.every((ref) => !ref.startsWith("/assets/")),
  "dist asset references should be relative so GitHub project pages and custom domains work"
);
assert.ok(
  /new URL\("assets\/",\s*location\.href\)/.test(sourceHtml),
  "root static loader should resolve assets from the current page path"
);
assert.ok(
  sourceHtml.includes('name="lumen-asset-version"'),
  "source index should expose a build-time asset version marker"
);
assert.ok(
  !sourceHtml.includes("release-qa-input"),
  "source index should not rely on a hand-written release QA cache key"
);
assert.ok(
  !html.includes("%LUMEN_ASSET_VERSION%"),
  "dist index should receive a concrete asset version from the Vite build"
);
assert.equal(
  new URL("assets/", "https://example.github.io/game_studio_test/").pathname,
  "/game_studio_test/assets/",
  "static loader should work when deployed under a GitHub project-page subpath"
);
assert.equal(
  new URL("assets/", "https://example.github.io/").pathname,
  "/assets/",
  "static loader should also work at a user root or custom-domain root"
);

for (const ref of assetRefs) {
  const normalized = ref.replace(/^\.\//, "").replace(/^\//, "");
  assert.ok(existsSync(join(distRoot, normalized)), `referenced dist asset should exist: ${ref}`);
}

const assetDir = join(distRoot, "assets");
const requiredAssets = ["index.js", "main.js", "main.css", "phaser.js"];
for (const asset of requiredAssets) {
  assert.ok(existsSync(join(assetDir, asset)), `dist/assets/${asset} should exist for the current Pages loader`);
}

const entry = readFileSync(join(assetDir, "index.js"), "utf8");
assert.ok(entry.includes("main.js"), "dist entry should load the main game bundle");
assert.ok(entry.includes("main.css"), "dist entry should load the game stylesheet");
assert.ok(entry.includes("phaser.js"), "dist entry should keep Phaser in the vendor chunk");

const pagesAssets = ["main.js", "main.css", "phaser.js"];
for (const asset of pagesAssets) {
  const distPath = join(assetDir, asset);
  const pagesPath = join("assets", asset);
  assert.ok(existsSync(pagesPath), `root Pages asset should exist after build sync: assets/${asset}`);
  assert.equal(fileHash(pagesPath), fileHash(distPath), `root Pages asset should match dist build output: ${asset}`);
}

console.log("Dist smoke checks passed.");

function fileHash(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
