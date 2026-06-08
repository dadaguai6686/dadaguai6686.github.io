import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

type AssetBudget = {
  maxGzipKb: number;
  maxRawKb: number;
  path: string;
};

const budgets: AssetBudget[] = [
  { path: "dist/index.html", maxRawKb: 32, maxGzipKb: 10 },
  { path: "dist/assets/index.js", maxRawKb: 8, maxGzipKb: 4 },
  { path: "dist/assets/main.js", maxRawKb: 190, maxGzipKb: 65 },
  { path: "dist/assets/main.css", maxRawKb: 90, maxGzipKb: 18 },
  { path: "dist/assets/phaser.js", maxRawKb: 1600, maxGzipKb: 370 }
];

const maxTotalGzipKb = 460;
let totalGzipBytes = 0;

for (const budget of budgets) {
  assert.ok(existsSync(budget.path), `budgeted production asset should exist: ${budget.path}`);
  const bytes = readFileSync(budget.path);
  const rawKb = bytes.length / 1024;
  const gzipKb = gzipSync(bytes, { level: 9 }).length / 1024;
  totalGzipBytes += gzipKb * 1024;

  assert.ok(
    rawKb <= budget.maxRawKb,
    `${budget.path} raw size ${rawKb.toFixed(1)} KiB exceeds ${budget.maxRawKb} KiB`
  );
  assert.ok(
    gzipKb <= budget.maxGzipKb,
    `${budget.path} gzip size ${gzipKb.toFixed(1)} KiB exceeds ${budget.maxGzipKb} KiB`
  );
}

const totalGzipKb = totalGzipBytes / 1024;
assert.ok(
  totalGzipKb <= maxTotalGzipKb,
  `total production gzip size ${totalGzipKb.toFixed(1)} KiB exceeds ${maxTotalGzipKb} KiB`
);

console.log("Production budget checks passed.");
