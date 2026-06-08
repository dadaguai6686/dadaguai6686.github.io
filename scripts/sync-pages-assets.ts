import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const assets = ["main.js", "main.css", "phaser.js"];

for (const asset of assets) {
  const source = join("dist", "assets", asset);
  const target = join("assets", asset);
  assert.ok(existsSync(source), `cannot sync missing build asset: ${source}`);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  assert.equal(fileHash(target), fileHash(source), `synced asset hash mismatch: ${asset}`);
}

console.log(`Synced Pages assets: ${assets.join(", ")}`);

function fileHash(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
