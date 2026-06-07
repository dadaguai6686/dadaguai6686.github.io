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
assert.ok(html.includes('id="mission-toast"'), "in-run mission transition toast should exist in HTML");
assert.ok(html.includes('id="quick-brief"'), "menu should expose a compact first-screen objective brief");
assert.ok(html.includes('id="game-dossier"'), "menu should explain the game fantasy and win/loss loop");
assert.ok(html.includes('id="launch-brief"'), "menu should include an illustrated launch briefing");
assert.ok(html.includes('id="launch-map"'), "launch briefing should include a route map");
assert.ok(html.includes('id="first-minute-route"'), "menu should give players an actionable first-minute route");
assert.ok(html.includes('id="recap-action-plan"'), "run recap should include a structured next-run action plan");
assert.ok(html.includes("下一局作战计划"), "run recap action plan should be labeled in Chinese");
assert.ok(html.includes('id="coach-rail"'), "route coach should expose a visible four-step progress rail");
assert.ok(html.includes('role="list"'), "route coach progress rail should expose list semantics");
assert.ok(html.includes("首局作战令"), "launch briefing should provide first-run orders in Chinese");
assert.ok(html.includes("安全读图"), "launch briefing should explain the safe opening read phase");
assert.ok(html.includes("北侧撤离"), "launch briefing should explain the evacuation target");
assert.ok(html.includes("先补给"), "quick brief should explain the opening supply verb");
assert.ok(html.includes("再维修"), "quick brief should explain the repair verb before long docs");
assert.ok(html.includes("撤离升级"), "quick brief should explain the wave clear and upgrade verb");
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
  html.indexOf('id="quick-brief"') < html.indexOf('id="start-button"'),
  "compact first-screen objective brief should appear before the primary start action"
);
assert.ok(
  html.indexOf('id="start-button"') < html.indexOf('id="game-dossier"'),
  "primary start action should appear before detailed dossier cards on mobile"
);
assert.ok(
  html.indexOf('id="start-button"') < html.indexOf('id="launch-brief"'),
  "primary start action should appear before the illustrated launch briefing on mobile"
);
assert.ok(
  html.indexOf('id="start-button"') < html.indexOf('id="field-guide"'),
  "primary start action should appear before detailed field guide on mobile"
);
assert.ok(main.includes("renderRadar(detail.radar"), "HUD updates should render the live radar");
assert.ok(main.includes("renderTacticalScan()"), "pause overlay should render the tactical scan");
assert.ok(main.includes("updateWaveIntro(detail)"), "HUD updates should render wave intro briefing");
assert.ok(main.includes("renderMissionToast(detail)"), "HUD updates should render in-run mission transition toasts");
assert.ok(main.includes("合约完成，切回主目标"), "mission toast should clearly transition completed contracts back to the main objective");
assert.ok(main.includes("合约失败，主目标仍可完成"), "mission toast should keep failed contracts from feeling like run failure");
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
assert.ok(main.includes("buildUpgradeRecommendation"), "upgrade choices should explain a recommendation based on the last wave");
assert.ok(main.includes("升级建议：优先"), "upgrade choices should show a localized recommendation header");
assert.ok(main.includes("短板原因"), "upgrade choices should explain why an upgrade is recommended");
assert.ok(main.includes("系统推荐"), "recommended upgrade cards should be visibly labeled in Chinese");
assert.ok(main.includes("选择理由"), "each upgrade card should explain when to choose it");
assert.ok(main.includes("buildUpgradeForecast"), "upgrade choices should preview the next wave before the player chooses");
assert.ok(main.includes("下一波预报"), "upgrade choices should label the next-wave forecast in Chinese");
assert.ok(main.includes("区域"), "upgrade forecast should name the next sector");
assert.ok(main.includes("事件"), "upgrade forecast should name the next wave event");
assert.ok(main.includes("合约"), "upgrade forecast should name the next tactical contract");
assert.ok(main.includes("buildForecastUpgradeRecommendation"), "upgrade recommendations should account for next-wave pressure");
assert.ok(main.includes("buildRecapActionPlan"), "run recap should build a structured post-run action plan");
assert.ok(main.includes("buildChargeLossRecapPlan"), "charge loss recap should teach the next-run supply route");
assert.ok(main.includes("buildHullLossRecapPlan"), "hull loss recap should teach pulse and hazard routing");
assert.ok(main.includes("下一波作战计划"), "wave-clear recap should point toward the next wave in Chinese");
assert.ok(main.includes("先吃 2-3 个流明"), "charge-loss plan should give a concrete opening correction");
assert.ok(main.includes("碎片贴脸就按脉冲"), "hull-loss plan should give a concrete survival correction");
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
assert.ok(simulation.includes("合约完成：继续修信标"), "coach should clearly guide after completed contracts");
assert.ok(simulation.includes("合约失败，清主目标"), "objective copy should clearly guide after failed contracts");
assert.ok(main.includes('"data-kind": "relay"'), "radar nodes should expose stable data-kind markers");
assert.ok(main.includes('"data-kind": "player"'), "radar nodes should expose player marker for QA");
assert.ok(main.includes('"data-kind": "guide"'), "radar nodes should expose guide markers for QA");
assert.ok(main.includes("score:"), "audio bus should include a score feedback sound");
assert.ok(styles.includes("#radar-panel"), "desktop radar should have CSS");
assert.ok(styles.includes("#tactical-scan"), "pause tactical scan should have CSS");
assert.ok(styles.includes("#mission-toast"), "mission transition toast should have CSS");
assert.ok(styles.includes("#quick-brief"), "compact first-screen objective brief should have CSS");
assert.ok(styles.includes("#launch-brief"), "launch briefing should have CSS");
assert.ok(styles.includes(".launch-route-line"), "launch route map should render an obvious route line");
assert.ok(styles.includes(".radar-guide"), "radar guide should have CSS");
assert.ok(styles.includes(".tactical-scan-legend"), "pause tactical scan should have a legend style");
assert.ok(styles.includes("#coach-rail"), "route coach progress rail should have CSS");
assert.ok(styles.includes('span[data-state="active"]'), "route coach should visually mark the active step");
assert.ok(styles.includes("#game-dossier"), "mission dossier should have CSS");
assert.ok(styles.includes("#first-minute-route"), "first-minute route should have CSS");
assert.ok(styles.includes(".upgrade-brief"), "upgrade recommendation header should have CSS");
assert.ok(styles.includes(".upgrade-forecast"), "next-wave upgrade forecast should have CSS");
assert.ok(styles.includes(".upgrade-forecast-chips"), "next-wave forecast should style compact sector/event/contract tags");
assert.ok(styles.includes('[data-recommended="true"]'), "recommended upgrade cards should have a highlighted style");
assert.ok(styles.includes(".upgrade-tag"), "upgrade cards should have a visible role or recommendation tag");
assert.ok(styles.includes("#recap-action-plan"), "structured recap action plan should have CSS");
assert.ok(styles.includes(".recap-plan-header"), "recap action plan should have a visible header");
assert.ok(styles.includes('#recap-action-plan article[data-tone="warning"]'), "recap action plan should highlight warning steps");
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
