import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const gameScene = readFileSync("src/game/GameScene.ts", "utf8");
const main = readFileSync("src/main.ts", "utf8");
const styles = readFileSync("src/styles.css", "utf8");

assert.ok(html.includes('id="radar-panel"'), "desktop radar panel should exist in HTML");
assert.ok(html.includes('id="tactical-scan"'), "pause tactical scan should exist in HTML");
assert.ok(html.includes('id="wave-intro"'), "wave intro briefing should exist in HTML");
assert.ok(html.includes('id="game-dossier"'), "menu should explain the game fantasy and win/loss loop");
assert.ok(html.includes('id="first-minute-route"'), "menu should give players an actionable first-minute route");
assert.ok(html.includes("读图补电"), "first-minute route should explain the opening supply step in Chinese");
assert.ok(!html.includes("Roguelite"), "visible genre copy should be localized to Chinese");
assert.ok(
  html.indexOf('id="start-button"') < html.indexOf('id="mission-brief"'),
  "primary start action should appear before long mission copy on mobile"
);
assert.ok(
  html.indexOf('id="start-button"') < html.indexOf('id="field-guide"'),
  "primary start action should appear before detailed field guide on mobile"
);
assert.ok(main.includes("renderRadar(detail.radar"), "HUD updates should render the live radar");
assert.ok(main.includes("renderTacticalScan()"), "pause overlay should render the tactical scan");
assert.ok(main.includes("updateWaveIntro(detail)"), "HUD updates should render wave intro briefing");
assert.ok(main.includes("buildObjectiveStripTitle"), "HUD objective strip should use contextual mission copy");
assert.ok(main.includes("buildMissionStatusText"), "HUD mission text should prefer current objective state over stale event copy");
assert.ok(main.includes("暂停战术说明"), "pause overlay should explain that the scan is safe to read");
assert.ok(main.includes("resetVirtualInput"), "touch input should reset when pausing or losing focus");
assert.ok(main.includes("lostpointercapture"), "touch controls should recover when pointer capture is lost");
assert.ok(main.includes("setPointerCapture"), "touch controls should capture active pointers");
assert.ok(!main.includes("<small>Lv "), "upgrade cards should use localized level labels");
assert.ok(main.includes("createRadarNodes"), "radar and scan should share SVG node construction");
assert.ok(gameScene.includes("SECTOR_VISUALS"), "Phaser scene should define sector-specific visual styles");
assert.ok(gameScene.includes("drawSectorField"), "Phaser scene should render sector-specific backdrops");
assert.ok(gameScene.includes("renderContractFocus"), "Phaser scene should render contract focus markers");
assert.ok(main.includes('"data-kind": "relay"'), "radar nodes should expose stable data-kind markers");
assert.ok(main.includes('"data-kind": "player"'), "radar nodes should expose player marker for QA");
assert.ok(styles.includes("#radar-panel"), "desktop radar should have CSS");
assert.ok(styles.includes("#tactical-scan"), "pause tactical scan should have CSS");
assert.ok(styles.includes(".tactical-scan-legend"), "pause tactical scan should have a legend style");
assert.ok(styles.includes("#game-dossier"), "mission dossier should have CSS");
assert.ok(styles.includes("#first-minute-route"), "first-minute route should have CSS");
assert.ok(styles.includes("touch-action: none"), "mobile controls should disable browser touch gestures");
assert.ok(styles.includes('[data-active="true"]'), "touch buttons should expose an active pressed state");
assert.ok(styles.includes("@media (pointer: coarse), (hover: none)"), "touch devices wider than phones should still get controls");
assert.ok(
  styles.includes('#shell[data-status="playing"] #touch-controls'),
  "touch controls should be enabled by game status for touch devices"
);
assert.ok(
  styles.includes('#shell[data-status="playing"] #radar-panel'),
  "touch-device play should hide the desktop radar to avoid the pause button overlap"
);

console.log("UI static smoke checks passed.");
