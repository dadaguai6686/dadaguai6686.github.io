import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const gameScene = readFileSync("src/game/GameScene.ts", "utf8");
const input = readFileSync("src/game/input.ts", "utf8");
const main = readFileSync("src/main.ts", "utf8");
const simulation = readFileSync("src/game/simulation.ts", "utf8");
const styles = readFileSync("src/styles.css", "utf8");
const viteConfig = readFileSync("vite.config.ts", "utf8");
const closeCallFeedbackIndex = gameScene.indexOf("if (closeCallDelta > 0)");
const checkpointFeedbackIndex = gameScene.indexOf("newlyCheckpointed.forEach");
const compactLandscapeDetailsPattern =
  /#shell\[data-status="playing"\]\s+#contract-requirement,\s*#shell\[data-status="playing"\]\s+#coach-detail,\s*#shell\[data-status="playing"\]\s+#pilot-tip-detail\s*\{\s*display:\s*-webkit-box;/g;
const hiddenLandscapeDetailsPattern =
  /#shell\[data-status="playing"\]\s+#contract-requirement,\s*#shell\[data-status="playing"\]\s+#coach-detail,\s*#shell\[data-status="playing"\]\s+#pilot-tip-detail\s*\{\s*display:\s*none;/;
const mobilePauseTouchTargetPattern =
  /#mobile-pause-button\s*\{[\s\S]*?min-width:\s*64px;[\s\S]*?min-height:\s*44px;/;
const touchStickLabelPattern = /#touch-stick b\s*\{[\s\S]*?bottom:\s*9px;[\s\S]*?max-width:\s*calc\(100% - 22px\);/;
const compactLandscapeHudSafeZonePattern =
  /#shell\[data-status="playing"\]\s+#hud\s*\{[\s\S]*?right:\s*max\(132px,[\s\S]*?left:\s*max\(124px,[\s\S]*?max-height:\s*118px;[\s\S]*?grid-template-columns:\s*minmax\(138px,\s*0\.72fr\)\s*minmax\(0,\s*1\.28fr\);/;
const hiddenBriefingContractPattern =
  /#shell\[data-status="playing"\]\[data-briefing="true"\]\s+#contract-panel\s*\{[^}]*display:\s*none;/;

assert.ok(html.includes('id="boot-status"'), "HTML should include a boot loading status before the game bundle loads");
assert.ok(html.includes("正在加载流明漂航"), "boot loading status should be localized in Chinese");
assert.ok(html.includes("markBootError"), "boot loader should show a localized error if module loading fails");
assert.ok(html.includes('new URL("assets/", location.href)'), "Pages loader should resolve assets relative to the current page path");
assert.ok(html.includes('location.port === "5173"'), "source loader should be limited to the Vite dev server port");
assert.ok(html.includes("!isLocalDev"), "non-dev static hosts should use built assets instead of the TypeScript source entry");
assert.ok(!html.includes('"/assets/main.js"'), "Pages loader should not hard-code the GitHub root asset path");
assert.ok(!html.includes('"/assets/main.css"'), "Pages loader should not hard-code the GitHub root stylesheet path");
assert.ok(html.includes("五波救援街机"), "menu eyebrow should describe the playable format in player-facing Chinese");
assert.ok(html.includes('id="game-wrap" tabindex="-1"'), "game canvas surface should be programmatically focusable");
assert.ok(html.includes('id="radar-panel"'), "desktop radar panel should exist in HTML");
assert.ok(html.includes('id="tactical-scan"'), "pause tactical scan should exist in HTML");
assert.ok(
  html.includes('role="dialog"') && html.includes('aria-modal="true"') && html.includes('aria-labelledby="overlay-title"'),
  "pause/menu overlay should expose modal dialog semantics"
);
assert.ok(html.includes('id="overlay-title"'), "overlay dialog should have a stable labelled title");
assert.ok(html.includes('id="wave-intro"'), "wave intro briefing should exist in HTML");
assert.ok(html.includes('id="mission-toast"'), "in-run mission transition toast should exist in HTML");
assert.ok(html.includes('id="combat-log"'), "in-run combat feedback log should exist in HTML");
assert.ok(html.includes('id="combat-log-history"'), "combat feedback log should keep a short recent event history");
assert.ok(html.includes("战斗记录"), "combat feedback log should be labeled in Chinese");
assert.ok(html.includes('id="directive-chip"'), "in-run contract, coach, and navigation copy should share one directive chip");
assert.ok(html.includes('<aside id="hud">'), "frequently updating HUD should not use a broad aria-live region");
assert.ok(!html.includes('<aside id="hud" aria-live'), "HUD aria-live should stay scoped to discrete alerts instead of the full HUD");
assert.ok(html.includes('id="quick-brief"'), "menu should expose a compact first-screen objective brief");
assert.ok(html.includes('id="control-primer"'), "menu should expose first-viewport movement and action controls");
assert.ok(html.includes('id="loop-primer"'), "menu should expose a compact reason to keep playing");
assert.ok(html.includes('id="game-dossier"'), "menu should explain the game fantasy and win/loss loop");
assert.ok(html.includes('id="launch-brief"'), "menu should include an illustrated launch briefing");
assert.ok(html.includes('id="mission-library"'), "long mission reference material should be collapsed behind a menu disclosure");
assert.ok(html.includes('id="control-library"'), "detailed controls should be collapsed behind a control disclosure");
assert.ok(html.includes('id="progress-library"'), "long-term records and settings should be collapsed behind a progress disclosure");
assert.ok(html.includes("展开记录、成就与设置"), "progress disclosure should be labeled in Chinese");
assert.ok(
  html.indexOf('id="session-tools"') < html.indexOf('id="progress-library"'),
  "pause-safe route and accessibility settings should live outside the hidden progress disclosure"
);
assert.ok(html.includes('id="pause-audio-toggle"'), "pause-safe settings should include an audio toggle");
assert.ok(html.includes('id="launch-map"'), "launch briefing should include a route map");
assert.ok(html.includes('id="first-minute-route"'), "menu should give players an actionable first-minute route");
assert.ok(html.includes('id="recap-action-plan"'), "run recap should include a structured next-run action plan");
assert.ok(html.includes("下一局作战计划"), "run recap action plan should be labeled in Chinese");
assert.ok(html.includes('id="coach-rail"'), "route coach should expose a visible four-step progress rail");
assert.ok(html.includes('role="list"'), "route coach progress rail should expose list semantics");
assert.ok(html.includes('class="coach-kicker">路线教练'), "route coach should keep a persistent visible coach label");
assert.ok(html.includes("首局作战令"), "launch briefing should provide first-run orders in Chinese");
assert.ok(html.includes("安全读图"), "launch briefing should explain the safe opening read phase");
assert.ok(html.includes("北侧撤离"), "launch briefing should explain the evacuation target");
assert.ok(html.includes("先移动补给"), "quick brief should explain movement before the opening supply verb");
assert.ok(html.includes("WASD / 方向键 / 左下摇杆"), "first-viewport controls should explain movement on keyboard and touch");
assert.ok(html.includes('id="touch-stick" role="group" aria-label="拖动移动"'), "touch joystick should expose a localized movement label");
assert.ok(html.includes("<b>拖动移动</b>"), "touch joystick should visibly explain the movement gesture");
assert.ok(html.includes(">按住修复</button>"), "touch repair button should visibly explain that repair is held");
assert.ok(html.includes("过波选升级"), "first-viewport motivation should mention upgrades");
assert.ok(html.includes("今日挑战与路线复盘"), "first-viewport motivation should mention route replay");
assert.ok(html.includes("再维修"), "quick brief should explain the repair verb before long docs");
assert.ok(html.includes("撤离升级"), "quick brief should explain the wave clear and upgrade verb");
assert.ok(html.includes("读图补电"), "first-minute route should explain the opening supply step in Chinese");
assert.ok(html.includes("先完成 4 个金色流明合约"), "first-run briefing should align with the four-lumen opening contract");
assert.ok(html.includes('id="launch-commit-detail"'), "first-run briefing should expose dynamic route copy");
assert.ok(html.includes('id="launch-order-focus-title"'), "first-run order title should be dynamically difficulty-aware");
assert.ok(html.includes('id="first-route-title"'), "first-minute route title should be dynamically difficulty-aware");
assert.ok(html.includes("E / 修复键"), "visible control copy should support keyboard and touch repair controls");
assert.ok(html.includes("Space / 推进键"), "visible control copy should support keyboard and touch boost controls");
assert.ok(html.includes("Q / 脉冲键"), "visible control copy should support keyboard and touch pulse controls");
assert.ok(html.includes("viewport-fit=cover"), "mobile viewport should opt into safe-area handling");
assert.ok(!html.includes("Phaser 场景"), "boot copy should not expose engine internals");
assert.ok(!html.includes("中文 HUD"), "boot copy should describe the interface in player-facing Chinese");
assert.ok(!html.includes("中文 2D"), "visible genre copy should prefer Chinese wording over 2D shorthand");
assert.ok(!html.includes("中文二维"), "visible genre copy should avoid developer-facing 2D shorthand");
assert.ok(!html.includes("Roguelite"), "visible genre copy should be localized to Chinese");
assert.ok(
  html.indexOf('id="start-button"') < html.indexOf('id="mission-brief"'),
  "primary start action should appear before long mission copy on mobile"
);
assert.ok(
  html.indexOf('id="start-button"') < html.indexOf('id="control-primer"'),
  "primary start action should appear before secondary control chips"
);
assert.ok(
  html.indexOf('id="start-button"') < html.indexOf('id="launch-commit"'),
  "primary start action should appear before first-run route notes"
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
  html.indexOf('id="start-button"') < html.indexOf('id="mission-library"'),
  "primary start action should appear before expandable reference material"
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
assert.ok(main.includes("hasOwnKey"), "save parsing should reject inherited prototype keys");
assert.ok(!main.includes(" in DIFFICULTY_SETTINGS"), "save parsing should not accept inherited difficulty keys");
assert.ok(!main.includes(" in ACHIEVEMENTS"), "save parsing should not accept inherited achievement keys");
assert.ok(main.includes("function finiteClampedNumber"), "save parsing should clamp persisted numeric stats");
assert.ok(main.includes("function parseBoolean"), "save parsing should reject string booleans instead of treating them as true");
assert.ok(main.includes("normalizeRouteSeed(numericSeed)"), "save parsing should normalize persisted route seeds");
assert.ok(main.includes("updateFirstRunBriefing"), "difficulty changes should update first-run briefing copy");
assert.ok(main.includes("getContractFor(1, selectedDifficulty)"), "first-run briefing should derive its contract from the selected difficulty");
assert.ok(main.includes('"无损起手"'), "hardcore first-run briefing should avoid the four-lumen standard contract copy");
assert.ok(main.includes('"读图保命"'), "hardcore first-minute route should teach survival before collection");
assert.ok(main.includes("completeBootStatus"), "runtime should hide the boot loading status after initialization");
assert.ok(main.includes('document.body.dataset.gameReady = "true"'), "runtime should mark the page as game-ready");
assert.ok(main.includes("bootStatus.hidden = true"), "runtime should explicitly hide the boot layer after initialization");
assert.ok(
  html.includes("#boot-status[hidden]") && html.includes("display: none"),
  "hidden boot layer should not keep a full-screen box after startup"
);
assert.ok(main.includes("initLocalReleaseQaMode"), "runtime should expose a local-only release QA entry for browser evidence");
assert.ok(main.includes('window.addEventListener("game:scene-ready", onGameSceneReady, { once: true })'), "release QA mode should wait for Phaser scene readiness");
assert.ok(main.includes("initLocalReleaseQaModeOnce"), "release QA mode should have a once-only initialization guard");
assert.ok(main.includes("releaseQaModeInitialized"), "release QA mode should not initialize twice");
assert.ok(main.includes("releaseQaSceneReady"), "release QA mode should track scene readiness before syncing state");
assert.ok(main.includes("__lumenRunInputProbe"), "release QA mode should expose an explicit local input probe");
assert.ok(main.includes("runLocalReleaseQaInputProbe"), "release QA input probe should use the simulation rules directly");
assert.ok(main.includes("#lumen-input-probes"), "release QA input probe should be persisted as read-only DOM evidence");
assert.ok(main.includes("writeLocalReleaseQaInputProbeNode"), "release QA input probe should write a machine-readable evidence node");
assert.ok(main.includes("local-release-qa-simulation"), "release QA input probe should label simulated evidence honestly");
assert.ok(main.includes("updateSimulation(state, input"), "release QA input probe should advance the core simulation");
assert.ok(gameScene.includes('new CustomEvent("game:scene-ready"'), "Phaser scene should announce when QA snapshots can be applied");
assert.ok(main.includes('params.get("qa") === "release"'), "release QA mode should require an explicit query flag");
assert.ok(main.includes('host === "localhost"') && main.includes('host === "127.0.0.1"'), "release QA mode should only run on local hosts");
assert.ok(main.includes('new CustomEvent("game:qa-state"'), "release QA mode should synchronize Phaser and DOM state");
assert.ok(gameScene.includes('window.addEventListener("game:qa-state"'), "Phaser scene should accept local-only QA state snapshots");
assert.ok(main.includes("renderTacticalScan()"), "pause overlay should render the tactical scan");
assert.ok(main.includes("configureOverlayDisclosures"), "overlay should configure menu, pause, recap, and upgrade disclosure density");
assert.ok(
  main.includes('progressLibrary.hidden = mode === "paused" || mode === "upgrade"'),
  "pause and upgrade overlays should hide long-term progress panels"
);
assert.ok(main.includes('menuOptions.hidden = mode === "paused"'), "pause overlay should hide new-route menu actions");
assert.ok(main.includes("pauseAudioToggle"), "pause overlay should expose an audio toggle outside hidden menu actions");
assert.ok(
  main.includes('latestStatus !== "paused" && !progressLibrary.open'),
  "settings tools should stay visible in pause while remaining collapsed in menu progress"
);
assert.ok(main.includes("prefersReducedMotion()"), "new saves should initialize reduced-motion from the system preference");
assert.ok(main.includes("syncOverlayState"), "overlay should hide background HUD semantically");
assert.ok(main.includes("aria-hidden"), "overlay background should be hidden from accessibility surfaces");
assert.ok(main.includes("inert"), "overlay background should not remain focusable behind menus");
assert.ok(main.includes("updateWaveIntro(detail)"), "HUD updates should render wave intro briefing");
assert.ok(gameScene.includes("briefingActive: this.state.briefingActive"), "HUD bridge should expose opening briefing state to the DOM");
assert.ok(main.includes("setShellBriefingActive"), "DOM shell should track whether the opening briefing is active");
assert.ok(main.includes("renderMissionToast(detail)"), "HUD updates should render in-run mission transition toasts");
assert.ok(main.includes("directiveChip.dataset.status"), "directive chip should inherit contract status for compact HUD styling");
assert.ok(main.includes("showCombatLog"), "HUD should show localized in-run combat feedback details");
assert.ok(main.includes("hideCombatLog"), "HUD should hide combat feedback when leaving play");
assert.ok(main.includes("COMBAT_LOG_HISTORY_LIMIT"), "combat feedback should cap recent event history");
assert.ok(main.includes("renderCombatLogHistory"), "combat feedback should render a recent event history");
assert.ok(main.includes("clearCombatLogHistory"), "combat feedback should clear old events outside active play");
assert.ok(main.includes("feedbackToneFor"), "combat feedback should map event kinds to visual tones");
assert.ok(main.includes("合约完成，切回主目标"), "mission toast should clearly transition completed contracts back to the main objective");
assert.ok(main.includes("合约失败，主目标仍可完成"), "mission toast should keep failed contracts from feeling like run failure");
assert.ok(main.includes("buildObjectiveStripTitle"), "HUD objective strip should use contextual mission copy");
assert.ok(main.includes("renderCoachRail"), "route coach should render the current four-step progress state");
assert.ok(main.includes("COACH_STEP_LABELS"), "route coach should use localized step labels");
assert.ok(main.includes('coachPanel.setAttribute("aria-label"'), "route coach should keep its role label when the current directive title changes");
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
assert.ok(main.includes("focusGameSurface"), "runtime should restore keyboard focus to the game surface after menu actions");
assert.ok(main.includes("gameWrap.focus"), "game surface focus should target the canvas wrapper");
assert.ok(main.includes("window.setTimeout(focus, 80)"), "game surface focus should retry after browser click focus settles");
assert.ok(main.includes("bufferGameSurfaceKeyboardInput"), "game surface should provide a DOM keyboard fallback when Phaser key state is missed");
assert.ok(main.includes('gameWrap.addEventListener("keydown"'), "DOM keyboard fallback should be attached to the focused game surface");
assert.ok(main.includes("getKeyboardMoveDirection"), "DOM keyboard fallback should map movement keys");
assert.ok(main.includes("keyboardMoveFallbackTimer"), "DOM keyboard fallback should release short movement input");
assert.ok(main.includes('touchStick.addEventListener("mousedown"'), "touch joystick should include a mouse-drag fallback for browser automation and hybrid devices");
assert.ok(main.includes('window.addEventListener("mousemove"'), "mouse-drag joystick fallback should follow pointer movement");
assert.ok(main.includes("tap: { boost: 0, repair: 0, pulse: 0 }"), "touch input should expose a short tap buffer");
assert.ok(input.includes("virtualTap.repair > 0"), "touch repair should use a short tap buffer so fast taps are not swallowed");
assert.ok(main.includes("bufferTouchTap(action);"), "touch action buttons should buffer repair, boost, and pulse taps");
assert.ok(main.includes('button.addEventListener("click"'), "touch action buttons should accept click fallback events");
assert.ok(main.includes("lostpointercapture"), "touch controls should recover when pointer capture is lost");
assert.ok(main.includes("setPointerCapture"), "touch controls should capture active pointers");
assert.ok(input.includes("resetKeys()"), "keyboard input should expose a full Phaser key reset");
assert.ok(input.includes("TAP_BUFFER_FRAMES"), "keyboard input should buffer very short taps");
assert.ok(input.includes('window.addEventListener("keydown"'), "keyboard input should latch keydown events between Phaser reads");
assert.ok(input.includes('window.removeEventListener("keydown"'), "keyboard input should release keydown latches when rebuilt");
assert.ok(gameScene.includes("this.resetInput();"), "scene should reset keyboard state at run and pause boundaries");
assert.ok(gameScene.includes("this.inputMapper?.destroy();"), "scene should not stack duplicate input listeners when rebuilding worlds");
assert.ok(!main.includes("<small>Lv "), "upgrade cards should use localized level labels");
assert.ok(main.includes("buildUpgradeRecommendation"), "upgrade choices should explain a recommendation based on the last wave");
assert.ok(simulation.includes("getUpgradePriorityIds"), "upgrade choices should bias toward the last-wave shortfall before filling random options");
assert.ok(gameScene.includes("campaignStats") && gameScene.includes("getCurrentWaveStats"), "wave-end details should separate campaign stats from current-wave recap stats");
assert.ok(gameScene.includes("drawGateGlyph"), "game canvas should render a distinct locked/open gate glyph");
assert.ok(gameScene.includes("drawStormField"), "game canvas should render a layered storm field instead of a plain circle");
assert.ok(gameScene.includes("fillRoundedRect(-12, 9, 24, 15, 5)"), "drone art should include a readable body/cockpit silhouette");
assert.ok(gameScene.includes("系统推荐") || main.includes("系统推荐"), "upgrade UI should keep the recommendation label visible");
assert.ok(main.includes("detail.campaignStats.contractsCompleted"), "save and history should preserve campaign contract progress");
assert.ok(main.includes("本波合约"), "recap metrics should label current-wave contract counts clearly");
assert.ok(main.includes("升级建议：优先"), "upgrade choices should show a localized recommendation header");
assert.ok(main.includes("短板原因"), "upgrade choices should explain why an upgrade is recommended");
assert.ok(main.includes("系统推荐"), "recommended upgrade cards should be visibly labeled in Chinese");
assert.ok(main.includes("选择理由"), "each upgrade card should explain when to choose it");
assert.ok(main.includes("upgrade-skip"), "wave-clear skip should be a secondary action inside the upgrade list");
assert.ok(!main.includes("innerHTML"), "game UI should build dynamic text with DOM nodes and textContent");
assert.ok(main.includes('startButton.hidden = detail.status === "won"'), "wave-clear overlay should not make skip-upgrade the primary CTA");
assert.ok(main.includes('latestStatus === "won"') && main.includes("过波后先处理升级选择"), "help hotkey should not replace the wave-clear upgrade loop");
assert.ok(main.includes("buildUpgradeForecast"), "upgrade choices should preview the next wave before the player chooses");
assert.ok(main.includes("下一波预报"), "upgrade choices should label the next-wave forecast in Chinese");
assert.ok(main.includes("区域"), "upgrade forecast should name the next sector");
assert.ok(main.includes("事件"), "upgrade forecast should name the next wave event");
assert.ok(main.includes("合约"), "upgrade forecast should name the next tactical contract");
assert.ok(main.includes("buildForecastUpgradeRecommendation"), "upgrade recommendations should account for next-wave pressure");
assert.ok(main.includes("buildRecapActionPlan"), "run recap should build a structured post-run action plan");
assert.ok(main.includes("buildRunEndCopy"), "loss overlays should summarize the concrete failure cause");
assert.ok(main.includes("失误根因"), "loss recap should label the root cause in Chinese");
assert.ok(main.includes("lossContext"), "loss recap should consume simulation-provided loss context");
assert.ok(main.includes("getLossSourceRootCause"), "loss recap should map concrete loss sources to Chinese root causes");
assert.ok(main.includes("getLossSourceNextAction"), "loss recap should map concrete loss sources to next-run actions");
assert.ok(main.includes("getContractFailureText"), "contract recap should explain the concrete contract failure reason");
assert.ok(main.includes("failureReason"), "contract and upgrade UI should read structured contract failure reasons");
assert.ok(main.includes("scaledRewardScore.toLocaleString()"), "contract reward UI should show the actual scaled payout");
assert.ok(!main.includes("rewardScore.toLocaleString()"), "contract reward UI should not show the unscaled base payout");
assert.ok(main.includes("buildLossUpgradeRecommendation"), "upgrade recommendations should react to concrete loss context");
assert.ok(main.includes("维修耗电"), "loss metrics should label repair-drain failures in Chinese");
assert.ok(simulation.includes("LUMEN_OVERCHARGE_BUFFER"), "lumen pickup should support a small overcharge buffer");
assert.ok(simulation.includes("RELAY_REPAIR_CHARGE"), "relay completion should release a small charge refill");
assert.ok(simulation.includes("GATE_STABILIZE_CHARGE"), "gate opening should grant evacuation charge");
assert.ok(simulation.includes("wave === 1"), "all first waves should delay storm pressure until players learn the route");
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
assert.ok(gameScene.includes("compactOpeningRoutePreview"), "opening route preview should keep the repair endpoint when lumen waypoints are capped");
assert.ok(gameScene.includes("selectRoutePreviewWaypoints"), "opening route preview should use route-specific waypoint selection");
assert.ok(gameScene.includes("getRoutePreviewRiskPenalty"), "opening route preview should account for hazard and storm risk");
assert.ok(gameScene.includes("distancePointToSegment"), "opening route preview should score route segment clearance");
assert.ok(gameScene.includes("!this.largeLabels && index > 0"), "opening route labels should collapse to the current step unless large labels are enabled");
assert.ok(gameScene.includes('waypoint.label !== "补流明"'), "opening route preview should not let lumen waypoints hide the repair endpoint");
assert.ok(gameScene.includes("getOpeningLumenWaypointCount"), "opening route preview should align lumen waypoints with the active contract");
assert.ok(gameScene.includes('state.contract.id === "relayRush"'), "opening route preview should prioritize relay rush contracts");
assert.ok(gameScene.includes("syncNavigatorLabel"), "Phaser scene should label the current navigation target in-world");
assert.ok(gameScene.includes("导航："), "in-world navigator label should be localized");
assert.ok(gameScene.includes("syncRepairPromptLabel"), "Phaser scene should show an in-world repair control prompt");
assert.ok(gameScene.includes("RELAY_CHECKPOINT_COUNT"), "Phaser scene should render relay repair checkpoint state");
assert.ok(gameScene.includes("relay.checkpoint >= checkpoint"), "relay progress rings should mark reached repair checkpoints");
assert.ok(gameScene.includes("维修节点锁定"), "relay checkpoint feedback should be localized in Chinese");
assert.ok(gameScene.includes("维修回落"), "repair decay should have localized in-world feedback");
assert.ok(simulation.includes("未锁定的进度正在缓慢回落"), "simulation should explain repair decay when players leave a relay early");
assert.ok(
  closeCallFeedbackIndex >= 0 && checkpointFeedbackIndex > closeCallFeedbackIndex,
  "repair checkpoint feedback should be dispatched after close-call feedback so the checkpoint milestone remains visible"
);
assert.ok(gameScene.includes('"score"'), "Phaser scene should emit score change feedback cues");
assert.ok(gameScene.includes('"closeCall"'), "Phaser scene should emit close-call feedback cues");
assert.ok(gameScene.includes("擦险脱离"), "close-call feedback should be localized in Chinese");
assert.ok(gameScene.includes("toLocaleString()}分"), "score feedback should show localized point deltas");
assert.ok(gameScene.includes("受击：连锁中断"), "hit feedback should explain chain loss in Chinese");
assert.ok(gameScene.includes("机体 -"), "hit feedback should show concrete damage in Chinese");
assert.ok(gameScene.includes("脉冲会推开附近碎片"), "pulse feedback should teach its tactical use");
assert.ok(gameScene.includes("renderRecoveryReadability"), "Phaser scene should render the post-hit recovery window");
assert.ok(gameScene.includes("恢复窗口"), "recovery window label should be localized in Chinese");
assert.ok(gameScene.includes("HIT_RECOVERY_SECONDS"), "recovery window visuals should share the simulation timing constant");
assert.ok(gameScene.includes("renderHazardTrajectories"), "Phaser scene should telegraph moving hazard paths");
assert.ok(gameScene.includes("projectHazardPosition"), "hazard telegraphs should project future shard positions");
assert.ok(simulation.includes("按住 E / 修复键"), "runtime objective copy should support keyboard and touch repair controls");
assert.ok(simulation.includes("每 25% 锁一个节点"), "runtime repair copy should explain relay checkpoint locks");
assert.ok(simulation.includes("RELAY_CHECKPOINT_COUNT"), "simulation should share a stable relay checkpoint count");
assert.ok(simulation.includes("擦险脱离"), "simulation should reward skillful close-call escapes with Chinese feedback");
assert.ok(simulation.includes("合约完成：继续修信标"), "coach should clearly guide after completed contracts");
assert.ok(simulation.includes("合约失败，清主目标"), "objective copy should clearly guide after failed contracts");
assert.ok(main.includes("锁节点后再撤"), "loss recap should teach retreating after locked repair checkpoints");
assert.ok(main.includes('"data-kind": "relay"'), "radar nodes should expose stable data-kind markers");
assert.ok(main.includes('"data-kind": "player"'), "radar nodes should expose player marker for QA");
assert.ok(main.includes('"data-kind": "guide"'), "radar nodes should expose guide markers for QA");
assert.ok(main.includes("score:"), "audio bus should include a score feedback sound");
assert.ok(main.includes("closeCall:"), "audio bus should include a close-call feedback sound");
assert.ok(main.includes('["擦险"'), "run recap should surface close-call counts");
assert.ok(styles.includes("#radar-panel"), "desktop radar should have CSS");
assert.ok(styles.includes("@media (max-width: 1080px) and (min-width: 701px)"), "medium-width play viewports should get a HUD-safe objective layout");
assert.ok(styles.includes("left: 330px"), "medium-width objective strip should start clear of the left HUD");
assert.ok(styles.includes("#tactical-scan"), "pause tactical scan should have CSS");
assert.ok(styles.includes("#mission-toast"), "mission transition toast should have CSS");
assert.ok(styles.includes("#combat-log"), "combat feedback log should have CSS");
assert.ok(styles.includes("#combat-log-history"), "combat feedback history should have CSS");
assert.ok(styles.includes("#directive-chip"), "directive chip should have CSS");
assert.ok(styles.includes("#game-wrap:focus"), "game surface focus should avoid visible browser focus artifacts");
assert.ok(styles.includes('#combat-log[data-tone="danger"]'), "combat feedback log should style danger events");
assert.ok(styles.includes("#combat-log-history li:nth-child(n + 2)"), "mobile combat feedback should limit old event history height");
assert.ok(styles.includes('#shell[data-status="playing"] #combat-log'), "mobile play should position combat feedback away from touch controls");
assert.ok(styles.includes("#objective-strip span") && styles.includes("-webkit-line-clamp: 2"), "mobile objective strip should clamp long route details");
assert.ok(styles.includes('#shell[data-status="playing"] #combo-timer[data-state="idle"]'), "mobile play should collapse the idle combo timer until a chain starts");
assert.ok(styles.includes('[data-briefing="true"] #signal-panel'), "mobile play should hide the score rating panel during the opening read phase");
assert.ok(!hiddenBriefingContractPattern.test(styles), "opening read phase should keep the tactical contract visible");
assert.ok(styles.includes("#quick-brief"), "compact first-screen objective brief should have CSS");
assert.ok(
  styles.includes("@media (max-height: 480px) and (orientation: landscape)") &&
    styles.includes("#quick-brief article") &&
    !styles.includes("#quick-brief,\n  #launch-commit"),
  "low-height landscape should keep a compressed quick brief instead of hiding the core loop"
);
assert.ok(
  (styles.match(compactLandscapeDetailsPattern) ?? []).length >= 2,
  "compact landscape HUD should keep contract, coach, and pilot details visible in clamped form"
);
assert.ok(
  !hiddenLandscapeDetailsPattern.test(styles),
  "compact landscape HUD should not hide contract, coach, and pilot details"
);
assert.ok(styles.includes("#control-primer"), "first-viewport control primer should have CSS");
assert.ok(styles.includes("#loop-primer"), "first-viewport progression primer should have CSS");
assert.ok(styles.includes('[data-overlay="true"] #hud'), "overlay should visually suppress background HUD");
assert.ok(styles.includes("#launch-brief"), "launch briefing should have CSS");
assert.ok(styles.includes(".mission-library summary"), "collapsed reference material should have styled disclosure controls");
assert.ok(styles.includes(".meta-library"), "progress and settings disclosure should have CSS");
assert.ok(styles.includes('#shell[data-status="playing"] .brand') && styles.includes("display: none"), "play HUD should remove brand chrome during active play");
assert.ok(styles.includes(".launch-route-line"), "launch route map should render an obvious route line");
assert.ok(styles.includes(".radar-guide"), "radar guide should have CSS");
assert.ok(styles.includes(".tactical-scan-legend"), "pause tactical scan should have a legend style");
assert.ok(styles.includes("#coach-rail"), "route coach progress rail should have CSS");
assert.ok(styles.includes("#directive-chip #coach-rail span") && styles.includes("font-size: 0"), "compact landscape should keep the coach rail as small dots");
assert.ok(styles.includes(".coach-title-stack"), "route coach should style a persistent label plus current directive title");
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
assert.ok(styles.includes("#touch-stick b"), "touch joystick label should have CSS");
assert.ok(touchStickLabelPattern.test(styles), "touch joystick label should stay inside the joystick instead of below the viewport");
assert.ok(!styles.includes("bottom: -17px") && !styles.includes("bottom: -18px") && !styles.includes("bottom: -20px"), "touch labels should not use negative bottom offsets");
assert.ok(mobilePauseTouchTargetPattern.test(styles), "mobile pause/help button should keep a 44px touch target");
assert.ok(styles.includes('[data-active="true"]'), "touch buttons should expose an active pressed state");
assert.ok(styles.includes("@media (pointer: coarse), (hover: none)"), "touch devices wider than phones should still get controls");
assert.ok(styles.includes("(pointer: coarse) and (orientation: landscape)"), "coarse pointer landscape devices should get a dedicated compact HUD");
assert.ok(compactLandscapeHudSafeZonePattern.test(styles), "landscape play HUD should reserve left and right touch-control safe zones");
assert.ok(styles.includes("max-height: 118px"), "landscape play HUD should stay as a short top strip instead of covering the playfield center");
assert.ok(styles.includes(".upgrade-skip"), "skip upgrade should be styled as a secondary action");
assert.ok(styles.includes("env(safe-area-inset-right) + 128px"), "coarse landscape objective should leave room for right touch actions");
assert.ok(main.includes("isCompactPlayViewport"), "compact play viewports should prevent notification stack overlap at runtime");
assert.ok(
  styles.includes('#shell[data-status="playing"] #wave-intro.show') &&
    styles.includes("right: max(84px") &&
    styles.includes("max-height: 44px"),
  "low-height landscape wave intro should stay compact and clear of the pause button"
);
assert.ok(
  styles.includes('#shell[data-status="playing"] #touch-controls'),
  "touch controls should be enabled by game status for touch devices"
);
assert.ok(
  styles.includes('#shell[data-status="playing"] #radar-panel'),
  "touch-device play should hide the desktop radar to avoid the pause button overlap"
);
assert.ok(gameScene.includes("getMotionPulse"), "Phaser scene should centralize reduced-motion pulse handling");
assert.ok(gameScene.includes("getMotionWave"), "Phaser scene should centralize reduced-motion wave handling");
assert.ok(gameScene.includes("this.reducedMotion ? 0.35"), "reduced motion should flatten in-world pulse animations");
assert.ok(gameScene.includes("this.reducedMotion ? 0 : Math.sin"), "reduced motion should flatten rotation and scale waves");
assert.ok(gameScene.includes("this.reducedMotion ? 0.78"), "reduced motion should avoid flickering invulnerability alpha");
assert.ok(gameScene.includes("this.reducedMotion ? 0 : this.time.now * 0.0006"), "reduced motion should stop storm field rotation");
assert.ok(viteConfig.includes("manualChunks"), "production build should split vendor chunks for release loading");
assert.ok(viteConfig.includes('return "phaser"'), "Phaser should ship as a stable vendor chunk");

console.log("UI static smoke checks passed.");
