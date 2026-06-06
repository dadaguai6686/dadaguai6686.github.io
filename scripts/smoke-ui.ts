import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const main = readFileSync("src/main.ts", "utf8");
const styles = readFileSync("src/styles.css", "utf8");

assert.ok(html.includes('id="radar-panel"'), "desktop radar panel should exist in HTML");
assert.ok(html.includes('id="tactical-scan"'), "pause tactical scan should exist in HTML");
assert.ok(main.includes("renderRadar(detail.radar"), "HUD updates should render the live radar");
assert.ok(main.includes("renderTacticalScan()"), "pause overlay should render the tactical scan");
assert.ok(main.includes("createRadarNodes"), "radar and scan should share SVG node construction");
assert.ok(styles.includes("#radar-panel"), "desktop radar should have CSS");
assert.ok(styles.includes("#tactical-scan"), "pause tactical scan should have CSS");
assert.ok(styles.includes(".tactical-scan-legend"), "pause tactical scan should have a legend style");

console.log("UI static smoke checks passed.");
