import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const distRoot = "dist";
const indexPath = join(distRoot, "index.html");

assert.ok(existsSync(indexPath), "dist/index.html should exist after npm run build");

const html = readFileSync(indexPath, "utf8");
const assetRefs = Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g))
  .map((match) => match[1])
  .filter((ref) => ref.startsWith("/assets/") || ref.startsWith("./assets/") || ref.startsWith("assets/"));

assert.ok(assetRefs.length > 0, "dist/index.html should reference built assets");

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

console.log("Dist smoke checks passed.");
