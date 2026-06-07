import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const gameScene = readFileSync("src/game/GameScene.ts", "utf8");
const input = readFileSync("src/game/input.ts", "utf8");
const main = readFileSync("src/main.ts", "utf8");
const simulation = readFileSync("src/game/simulation.ts", "utf8");
const styles = readFileSync("src/styles.css", "utf8");

assert.ok(html.includes('id="radar-panel"'), "desktop radar panel should exist in HTML");
assert.ok(html.includes('id="tactical-scan"'), "pause tactical scan should exist in HTML");
assert.ok(html.includes('id="wave-intro"'), "wave intro briefing should exist in HTML");
assert.ok(html.includes('id="game-dossier"'), "menu should explain the game fantasy and win/loss loop");
assert.ok(html.includes('id="first-minute-route"'), "menu should give players an actionable first-minute route");
assert.ok(html.includes('id="coach-rail"'), "route coach should expose a visible four-step progress rail");
assert.ok(html.includes('role="list"'), "route coach progress rail should expose list semantics");
assert.ok(html.includes("读图补电"), "first-minute route should explain the opening supply step in Chinese");
assert.ok(html.includes("E / 修复键"), "visible control copy should support keyboard and touch repair controls");
assert.ok(html.includes("Space / 推进键"), "visible control copy should support keyboard and touch boost controls");
assert.ok(html.includes("Q / 脉冲键"), "visible control copy should support keyboard and touch pulse controls");
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
assert.ok(main.includes("renderCoachRail"), "route coach should render the current four-step progress state");
assert.ok(main.includes("COACH_STEP_LABELS"), "route coach should use localized step labels");
assert.ok(main.includes('role", "listitem"'), "route coach progress steps should expose list item semantics");
assert.ok(main.includes('aria-current", "step"'), "route coach should mark the current step accessibly");
assert.ok(main.includes("buildMissionStatusText"), "HUD mission text should prefer current objective state over stale event copy");
assert.ok(main.includes("暂停战术说明"), "pause overlay should explain that the scan is safe to read");
assert.ok(main.includes("pauseForInterruption"), "runtime should pause when the page is interrupted");
assert.ok(main.includes("已自动暂停"), "auto-pause should tell players why the overlay appeared");
assert.ok(main.includes('window.addEventListener("blur", pauseForInterruption)'), "window blur should trigger auto-pause");
assert.ok(main.includes('window.addEventListener("pagehide", pauseForInterruption)'), "pagehide should trigger auto-pause");
assert.ok(main.includes('document.addEventListener("visibilitychange"'), "page visibility changes should be handled");
assert.ok(main.includes("resetVirtualInput"), "touch input should reset when pausing or losing focus");
assert.ok(main.includes("lostpointercapture"), "touch controls should recover when pointer capture is lost");
assert.ok(main.includes("setPointerCapture"), "touch controls should capture active pointers");
assert.ok(input.includes("resetKeys()"), "keyboard input should expose a full Phaser key reset");
assert.ok(gameScene.includes("this.resetInput();"), "scene should reset keyboard state at run and pause boundaries");
assert.ok(!main.includes("<small>Lv "), "upgrade cards should use localized level labels");
assert.ok(main.includes("createRadarNodes"), "radar and scan should share SVG node construction");
assert.ok(main.includes("radar-guide"), "radar and scan should draw the current navigation guide");
assert.ok(main.includes("导航 "), "radar summary should name the current guide target");
assert.ok(gameScene.includes("SECTOR_VISUALS"), "Phaser scene should define sector-specific visual styles");
assert.ok(gameScene.includes("drawSectorField"), "Phaser scene should render sector-specific backdrops");
assert.ok(gameScene.includes("renderContractFocus"), "Phaser scene should render contract focus markers");
assert.ok(gameScene.includes("renderOpeningRoutePreview"), "Phaser scene should draw the opening route preview");
assert.ok(gameScene.includes("buildOpeningRoutePreview"), "opening route preview should derive route targets from game state");
assert.ok(gameScene.includes("syncNavigatorLabel"), "Phaser scene should label the current navigation target in-world");
assert.ok(gameScene.includes("导航："), "in-world navigator label should be localized");
assert.ok(gameScene.includes("syncRepairPromptLabel"), "Phaser scene should show an in-world repair control prompt");
assert.ok(gameScene.includes('"score"'), "Phaser scene should emit score change feedback cues");
assert.ok(gameScene.includes("toLocaleString()}分"), "score feedback should show localized point deltas");
assert.ok(gameScene.includes("renderHazardTrajectories"), "Phaser scene should telegraph moving hazard paths");
assert.ok(gameScene.includes("projectHazardPosition"), "hazard telegraphs should project future shard positions");
assert.ok(simulation.includes("按住 E / 修复键"), "runtime objective copy should support keyboard and touch repair controls");
assert.ok(main.includes('"data-kind": "relay"'), "radar nodes should expose stable data-kind markers");
assert.ok(main.includes('"data-kind": "player"'), "radar nodes should expose player marker for QA");
assert.ok(main.includes('"data-kind": "guide"'), "radar nodes should expose guide markers for QA");
assert.ok(main.includes("score:"), "audio bus should include a score feedback sound");
assert.ok(styles.includes("#radar-panel"), "desktop radar should have CSS");
assert.ok(styles.includes("#tactical-scan"), "pause tactical scan should have CSS");
assert.ok(styles.includes(".radar-guide"), "radar guide should have CSS");
assert.ok(styles.includes(".tactical-scan-legend"), "pause tactical scan should have a legend style");
assert.ok(styles.includes("#coach-rail"), "route coach progress rail should have CSS");
assert.ok(styles.includes('span[data-state="active"]'), "route coach should visually mark the active step");
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
