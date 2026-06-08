import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const reportPath = "output/qa/release-browser-qa-summary-current.json";
const maxReportAgeMs = 24 * 60 * 60 * 1000;
const hashedDistAssets = ["index.js", "main.js", "main.css", "phaser.js"] as const;

type RectEvidence = {
  height?: number;
  left?: number;
  top?: number;
  visible?: boolean;
  width?: number;
};

type CanvasSignatureEvidence = {
  briefingActive?: boolean;
  colors?: number;
  elapsed?: number;
  height?: number;
  player?: {
    position?: {
      x?: number;
      y?: number;
    };
    velocity?: {
      x?: number;
      y?: number;
    };
  };
  samples?: number;
  width?: number;
};

type InputProbeEvidence = {
  action?: string;
  after?: CanvasSignatureEvidence;
  before?: CanvasSignatureEvidence;
  briefingEnded?: boolean;
  elapsedDelta?: number;
  kind?: "keyboard" | "touch";
  positionDelta?: number;
  source?: "local-release-qa-simulation";
};

type BrowserInputProbeEvidence = {
  action?: string;
  after?: CanvasSignatureEvidence;
  before?: CanvasSignatureEvidence;
  briefingEnded?: boolean;
  elapsedDelta?: number;
  id?: string;
  kind?: "keyboard" | "touch";
  positionDelta?: number;
  source?: "codex-in-app-browser-real-input";
};

type RealPlaythroughEvidence = {
  clearedWave?: number;
  elapsedSeconds?: number;
  enteredStatus?: string;
  postUpgradeContract?: string;
  postUpgradeSector?: string;
  postUpgradeStatus?: string;
  postUpgradeWave?: number;
  repairedRelays?: number;
  selectedUpgrade?: string;
  source?: "local-release-qa-simulation-wave-upgrade";
  upgradeClicked?: boolean;
  upgradeOptions?: number;
};

type BrowserQaResult = {
  bootDisplay?: string | null;
  bootHidden?: boolean;
  canvas?: {
    clientHeight?: number;
    clientWidth?: number;
    height?: number;
    width?: number;
  };
  canvasCount?: number;
  canvasSignature?: CanvasSignatureEvidence;
  coachRect?: RectEvidence;
  contractRequirement?: string;
  clickedStart?: boolean;
  firstRouteTitle?: string;
  hudRect?: RectEvidence;
  inputProbe?: InputProbeEvidence;
  browserInputProbe?: BrowserInputProbeEvidence;
  label?: string;
  launchFocusTitle?: string;
  objectiveDetail?: string;
  objectiveTitle?: string;
  overlayAriaModal?: string | null;
  overlayRect?: RectEvidence;
  overlayRole?: string | null;
  noHorizontalOverflow?: boolean;
  passed?: boolean;
  pilotRect?: RectEvidence;
  playfieldCenterClear?: boolean;
  realPlaythrough?: RealPlaythroughEvidence;
  quickBriefRect?: RectEvidence;
  recapPlanSteps?: number;
  resumeRect?: RectEvidence;
  selectedDifficulty?: string;
  startRect?: RectEvidence;
  status?: string;
  tacticalScanNodes?: number;
  touchBoostRect?: RectEvidence;
  touchControlsClearOfHud?: boolean;
  touchLabelWithinViewport?: boolean;
  touchPulseRect?: RectEvidence;
  touchRepairRect?: RectEvidence;
  touchStickLabelRect?: RectEvidence;
  touchStickRect?: RectEvidence;
  mobilePauseRect?: RectEvidence;
  upgradeOptions?: number;
  viewport?: {
    height?: number;
    width?: number;
  };
  contractRect?: RectEvidence;
  waveIntroClearOfPause?: boolean;
  waveIntroRect?: RectEvidence;
};

type BrowserQaReport = {
  browser?: string;
  canvasEvidence?: string;
  checkedAt?: string;
  distAssetHashes?: Record<string, string>;
  passed?: boolean;
  results?: BrowserQaResult[];
  target?: string;
};

assert.ok(
  existsSync(reportPath),
  `browser QA report is missing: ${reportPath}. Run the Codex in-app browser release pass before final release.`
);

const report = JSON.parse(readFileSync(reportPath, "utf8")) as BrowserQaReport;
assert.equal(report.browser, "Codex in-app browser", "browser QA should use the Codex in-app browser");
assert.ok(
  report.target === "http://127.0.0.1:4173" || report.target === "http://localhost:4173",
  "browser QA should target the local production preview URL"
);
assert.equal(report.passed, true, "browser QA report should be marked passed");
assertFreshReport(report);
assertDistAssetHashes(report.distAssetHashes);

const results = report.results ?? [];
assert.ok(
  results.length >= 17,
  "browser QA should cover menu, real start, wave-clear upgrade handoff, local and real browser input probes, mobile play, mobile pause, recap, and upgrade scenes"
);

const byLabel = new Map(results.map((result) => [result.label, result]));
const requiredLabels = [
  "desktop-standard-menu",
  "desktop-hardcore-menu-after-click",
  "desktop-real-start-flow",
  "desktop-wave-upgrade-handoff-probe",
  "desktop-keyboard-input-probe",
  "desktop-real-keyboard-input-probe",
  "mobile-portrait-menu",
  "mobile-portrait-playing-hud",
  "mobile-touch-input-probe",
  "mobile-real-touch-input-probe",
  "mobile-portrait-paused-qa",
  "mobile-landscape-menu",
  "mobile-landscape-playing-hud",
  "desktop-paused-qa",
  "desktop-wave-won-qa",
  "desktop-completed-qa",
  "desktop-lost-qa"
];

for (const label of requiredLabels) {
  assert.ok(byLabel.has(label), `browser QA should include ${label}`);
  assert.equal(byLabel.get(label)?.passed, true, `${label} should pass`);
}

for (const result of results) {
  assert.equal(result.canvasCount, 1, `${result.label} should render one game canvas`);
  assert.equal(result.noHorizontalOverflow, true, `${result.label} should not create horizontal overflow`);
  assert.ok((result.canvas?.clientWidth ?? 0) > 0, `${result.label} should expose a visible canvas width`);
  assert.ok((result.canvas?.clientHeight ?? 0) > 0, `${result.label} should expose a visible canvas height`);
  assert.ok(result.canvasSignature, `${result.label} should include runtime render signature evidence`);
  assert.ok((result.canvasSignature?.samples ?? 0) >= 96, `${result.label} should include enough runtime signature samples`);
  assert.ok((result.canvasSignature?.colors ?? 0) >= 8, `${result.label} runtime render signature should not be flat or blank`);
  assert.equal(result.bootHidden, true, `${result.label} should hide the boot loading layer after startup`);
  assert.equal(result.bootDisplay, "none", `${result.label} hidden boot layer should not keep a full-screen DOM box`);
}

const standard = byLabel.get("desktop-standard-menu")!;
assert.equal(standard.selectedDifficulty, "标准");
assert.equal(standard.launchFocusTitle, "补给起手");
assert.equal(standard.firstRouteTitle, "读图补电");
assert.equal(standard.quickBriefRect?.visible, true, "desktop menu should show the four-step quick brief");
assert.equal(standard.startRect?.visible, true, "desktop menu should show the start action");

const hardcore = byLabel.get("desktop-hardcore-menu-after-click")!;
assert.equal(hardcore.selectedDifficulty, "硬核");
assert.equal(hardcore.launchFocusTitle, "无损起手");
assert.equal(hardcore.firstRouteTitle, "读图保命");

const realStart = byLabel.get("desktop-real-start-flow")!;
assert.equal(realStart.clickedStart, true, "real start flow should click the visible start action");
assert.equal(realStart.status, "playing", "real start flow should enter playing state from the menu");
assert.equal(realStart.contractRect?.visible, true, "real start flow should show the tactical contract");
assert.equal(realStart.coachRect?.visible, true, "real start flow should show the route coach");
assert.equal(realStart.pilotRect?.visible, true, "real start flow should show the navigation prompt");
assert.match(realStart.objectiveTitle ?? "", /当前任务|紧急任务|维修任务|撤离任务/, "real start flow should expose a mission objective");
assert.match(realStart.contractRequirement ?? "", /流明|信标|无损|风暴|脉冲/, "real start flow should expose the tactical contract requirement");
assert.ok((realStart.canvasSignature?.colors ?? 0) >= 12, "real start flow should expose a varied live-game render signature");
assertWaveUpgradeHandoff();
assertInputProbe("desktop-keyboard-input-probe", "keyboard");
assertBrowserInputProbe("desktop-real-keyboard-input-probe", "keyboard");

const mobilePortrait = byLabel.get("mobile-portrait-menu")!;
assert.deepEqual(mobilePortrait.viewport, { width: 390, height: 844 });
assert.equal(mobilePortrait.quickBriefRect?.visible, true, "portrait menu should keep the quick brief visible");
assert.equal(mobilePortrait.startRect?.visible, true, "portrait menu should keep the start action visible");

const mobileLandscape = byLabel.get("mobile-landscape-menu")!;
assert.deepEqual(mobileLandscape.viewport, { width: 844, height: 390 });
assert.equal(mobileLandscape.quickBriefRect?.visible, true, "landscape menu should keep the quick brief visible");
assert.equal(mobileLandscape.startRect?.visible, true, "landscape menu should keep the start action visible");

assertMobilePlayingHud("mobile-portrait-playing-hud", { width: 390, height: 844 });
assertInputProbe("mobile-touch-input-probe", "touch");
assertBrowserInputProbe("mobile-real-touch-input-probe", "touch");
assertMobilePostInputHud("mobile-real-touch-input-probe", { width: 390, height: 844 });
assertMobilePlayingHud("mobile-landscape-playing-hud", { width: 844, height: 390 });

assertPausedScan("desktop-paused-qa", { width: 1440, height: 900 });
assertPausedScan("mobile-portrait-paused-qa", { width: 390, height: 844 });
assert.ok((byLabel.get("desktop-wave-won-qa")?.upgradeOptions ?? 0) >= 3, "wave-clear QA should offer upgrades");
assert.equal(byLabel.get("desktop-completed-qa")?.recapPlanSteps, 3, "completed recap should have a 3-step plan");
assert.equal(byLabel.get("desktop-lost-qa")?.recapPlanSteps, 3, "lost recap should have a 3-step plan");

console.log("Browser QA report checks passed.");

function assertFreshReport(browserReport: BrowserQaReport): void {
  const checkedAtMs = Date.parse(browserReport.checkedAt ?? "");
  assert.ok(Number.isFinite(checkedAtMs), "browser QA report should include a parseable checkedAt timestamp");
  const ageMs = Date.now() - checkedAtMs;
  assert.ok(ageMs >= 0, "browser QA report checkedAt should not be in the future");
  assert.ok(
    ageMs <= maxReportAgeMs,
    `browser QA report should be regenerated within 24 hours of release checks; current age is ${Math.round(ageMs / 60000)} minutes`
  );
}

function assertDistAssetHashes(distAssetHashes: BrowserQaReport["distAssetHashes"]): void {
  assert.ok(distAssetHashes, "browser QA report should include dist asset hashes to prevent stale evidence");
  for (const asset of hashedDistAssets) {
    const assetPath = join("dist", "assets", asset);
    assert.ok(existsSync(assetPath), `dist asset should exist before checking browser report hash: ${asset}`);
    assert.equal(
      distAssetHashes?.[asset],
      fileHash(assetPath),
      `browser QA report should match current production asset hash: ${asset}`
    );
  }
}

function assertInputProbe(label: string, kind: NonNullable<InputProbeEvidence["kind"]>): void {
  const result = byLabel.get(label)!;
  const probe = result.inputProbe;
  assert.equal(result.status, "playing", `${label} should end in a live playing state`);
  assert.equal(probe?.kind, kind, `${label} should record a ${kind} input probe`);
  assert.equal(
    probe?.source,
    "local-release-qa-simulation",
    `${label} should record the honest local QA input-probe source`
  );
  assert.equal(probe?.before?.briefingActive, true, `${label} should start during the opening read buffer`);
  assert.equal(probe?.after?.briefingActive, false, `${label} should clear the opening read buffer after QA input`);
  assert.equal(probe?.briefingEnded, true, `${label} should explicitly mark briefingEnded`);
  assert.ok((probe?.elapsedDelta ?? 0) > 0.05, `${label} should advance simulation time after QA input`);
  assert.ok((probe?.positionDelta ?? 0) > 1, `${label} should move the player after QA input`);
  assert.ok(
    Number.isFinite(probe?.before?.player?.position?.x) && Number.isFinite(probe?.after?.player?.position?.x),
    `${label} should include before/after player position evidence`
  );
}

function assertBrowserInputProbe(label: string, kind: NonNullable<BrowserInputProbeEvidence["kind"]>): void {
  const result = byLabel.get(label)!;
  const probe = result.browserInputProbe;
  assert.equal(result.status, "playing", `${label} should end in a live playing state`);
  assert.equal(probe?.kind, kind, `${label} should record a real ${kind} browser input probe`);
  if (kind === "touch") {
    assert.equal(
      probe?.action,
      "codex-in-app-browser-touch-stick-drag",
      `${label} should prove real touch movement through the joystick, not only an action button`
    );
  } else {
    assert.equal(probe?.action, "codex-in-app-browser-keyboard", `${label} should prove real keyboard movement`);
  }
  assert.equal(
    probe?.source,
    "codex-in-app-browser-real-input",
    `${label} should record Codex in-app browser input as the source`
  );
  assert.equal(probe?.before?.briefingActive, true, `${label} should start during the opening read buffer`);
  assert.equal(probe?.after?.briefingActive, false, `${label} should clear the opening read buffer after real browser input`);
  assert.equal(probe?.briefingEnded, true, `${label} should explicitly mark briefingEnded`);
  assert.ok((probe?.elapsedDelta ?? 0) > 0.05, `${label} should advance simulation time after real browser input`);
  assert.ok((probe?.positionDelta ?? 0) > 1, `${label} should move the player after real browser input`);
  assert.ok(
    Number.isFinite(probe?.before?.player?.position?.x) && Number.isFinite(probe?.after?.player?.position?.x),
    `${label} should include before/after player position evidence`
  );
}

function assertWaveUpgradeHandoff(): void {
  const result = byLabel.get("desktop-wave-upgrade-handoff-probe")!;
  const flow = result.realPlaythrough;
  assert.equal(
    flow?.source,
    "local-release-qa-simulation-wave-upgrade",
    "wave-upgrade handoff should label the local simulation source honestly"
  );
  assert.equal(flow?.enteredStatus, "playing", "wave-upgrade handoff should start from a playable wave state");
  assert.equal(flow?.clearedWave, 1, "wave-upgrade handoff should clear the first wave through updateSimulation");
  assert.equal(flow?.repairedRelays, 4, "wave-upgrade handoff should repair every relay before offering upgrades");
  assert.ok((flow?.upgradeOptions ?? 0) >= 3, "wave-upgrade handoff should expose upgrade choices after the cleared wave");
  assert.equal(flow?.upgradeClicked, true, "wave-upgrade handoff should click an upgrade choice in the DOM");
  assert.ok((flow?.selectedUpgrade ?? "").length > 0, "wave-upgrade handoff should record the selected upgrade");
  assert.equal(flow?.postUpgradeStatus, "playing", "wave-upgrade handoff should return to play after selecting an upgrade");
  assert.equal(flow?.postUpgradeWave, 2, "wave-upgrade handoff should advance to wave 2 after selecting an upgrade");
  assert.ok((flow?.elapsedSeconds ?? 0) > 10, "wave-upgrade handoff should record a substantive first-wave route duration");
  assert.ok((result.canvasSignature?.colors ?? 0) >= 12, "wave-upgrade handoff should finish with a varied live canvas signature");
}

function assertMobilePlayingHud(label: string, viewport: { width: number; height: number }): void {
  const result = byLabel.get(label)!;
  assert.deepEqual(result.viewport, viewport);
  assert.equal(result.status, "playing");
  assert.equal(result.contractRect?.visible, true, `${label} should keep contract details visible`);
  assert.equal(result.coachRect?.visible, true, `${label} should keep route coach details visible`);
  assert.equal(result.pilotRect?.visible, true, `${label} should keep navigation details visible`);
  assertRectInside(result.hudRect, result.contractRect, label, "contract details");
  assertRectInside(result.hudRect, result.coachRect, label, "route coach details");
  assertRectInside(result.hudRect, result.pilotRect, label, "navigation details");
  assert.equal(result.touchStickRect?.visible, true, `${label} should show the touch joystick`);
  assert.equal(result.touchStickLabelRect?.visible, true, `${label} should show the joystick label`);
  assert.equal(result.touchRepairRect?.visible, true, `${label} should show the hold-to-repair button`);
  assert.equal(result.touchBoostRect?.visible, true, `${label} should show the boost button`);
  assert.equal(result.touchPulseRect?.visible, true, `${label} should show the pulse button`);
  assert.equal(result.mobilePauseRect?.visible, true, `${label} should show the pause/help button`);
  assert.ok((result.touchStickRect?.width ?? 0) >= 88, `${label} joystick should keep a usable width`);
  assert.ok((result.touchStickRect?.height ?? 0) >= 88, `${label} joystick should keep a usable height`);
  assert.ok((result.touchRepairRect?.height ?? 0) >= 44, `${label} repair button should meet touch target height`);
  assert.ok((result.touchBoostRect?.height ?? 0) >= 44, `${label} boost button should meet touch target height`);
  assert.ok((result.touchPulseRect?.height ?? 0) >= 44, `${label} pulse button should meet touch target height`);
  assert.ok((result.mobilePauseRect?.width ?? 0) >= 44, `${label} pause button should meet touch target width`);
  assert.ok((result.mobilePauseRect?.height ?? 0) >= 44, `${label} pause button should meet touch target height`);
  assert.equal(result.touchLabelWithinViewport, true, `${label} joystick label should stay inside the visible viewport`);
  assert.equal(result.touchControlsClearOfHud, true, `${label} HUD should not overlap joystick or action controls`);
  assert.equal(result.hudRect?.visible, true, `${label} should include HUD rectangle evidence`);
  assert.equal(result.playfieldCenterClear, true, `${label} HUD should leave the playfield center clear`);
  if (viewport.width > viewport.height) {
    assert.ok((result.hudRect?.height ?? Number.POSITIVE_INFINITY) <= 128, `${label} HUD should stay as a compact top strip`);
    assert.equal(result.waveIntroClearOfPause, true, `${label} wave intro should not overlap the pause button`);
  }
}

function assertMobilePostInputHud(label: string, viewport: { width: number; height: number }): void {
  const result = byLabel.get(label)!;
  assert.deepEqual(result.viewport, viewport);
  assert.equal(result.status, "playing", `${label} should remain in live play after the real input probe`);
  assert.equal(result.contractRect?.visible, true, `${label} should keep contract details visible after input`);
  assert.equal(result.coachRect?.visible, true, `${label} should keep route coach details visible after input`);
  assertRectInside(result.hudRect, result.contractRect, label, "contract details");
  assertRectInside(result.hudRect, result.coachRect, label, "route coach details");
  assert.equal(result.touchStickRect?.visible, true, `${label} should keep the touch joystick visible after input`);
  assert.equal(result.touchRepairRect?.visible, true, `${label} should keep the repair button visible after input`);
  assert.equal(result.touchBoostRect?.visible, true, `${label} should keep the boost button visible after input`);
  assert.equal(result.touchPulseRect?.visible, true, `${label} should keep the pulse button visible after input`);
  assert.equal(result.mobilePauseRect?.visible, true, `${label} should keep the pause/help button visible after input`);
  assert.equal(result.touchControlsClearOfHud, true, `${label} HUD should not overlap joystick or action controls after input`);
  assert.equal(result.hudRect?.visible, true, `${label} should include HUD rectangle evidence after input`);
  assert.equal(result.playfieldCenterClear, true, `${label} HUD should leave the playfield center clear after input`);
  assert.ok((result.hudRect?.height ?? Number.POSITIVE_INFINITY) <= 196, `${label} HUD should stay compact after input`);
}

function assertRectInside(
  container: RectEvidence | undefined,
  child: RectEvidence | undefined,
  label: string,
  childName: string
): void {
  assert.ok(container?.visible, `${label} should include a visible HUD container before checking ${childName}`);
  assert.ok(child?.visible, `${label} should include visible ${childName}`);
  const containerLeft = container.left ?? 0;
  const containerTop = container.top ?? 0;
  const containerRight = containerLeft + (container.width ?? 0);
  const containerBottom = containerTop + (container.height ?? 0);
  const childLeft = child.left ?? Number.NaN;
  const childTop = child.top ?? Number.NaN;
  const childRight = childLeft + (child.width ?? 0);
  const childBottom = childTop + (child.height ?? 0);
  const tolerance = 1.5;

  assert.ok(Number.isFinite(childLeft) && Number.isFinite(childTop), `${label} ${childName} should include position evidence`);
  assert.ok(childLeft >= containerLeft - tolerance, `${label} ${childName} should not be clipped outside the HUD left edge`);
  assert.ok(childTop >= containerTop - tolerance, `${label} ${childName} should not be clipped outside the HUD top edge`);
  assert.ok(childRight <= containerRight + tolerance, `${label} ${childName} should not be clipped outside the HUD right edge`);
  assert.ok(childBottom <= containerBottom + tolerance, `${label} ${childName} should not be clipped outside the HUD bottom edge`);
}

function assertPausedScan(label: string, viewport: { width: number; height: number }): void {
  const result = byLabel.get(label)!;
  assert.deepEqual(result.viewport, viewport);
  assert.equal(result.status, "paused");
  assert.equal(result.overlayRole, "dialog", `${label} overlay should expose dialog semantics`);
  assert.equal(result.overlayAriaModal, "true", `${label} overlay should expose aria-modal`);
  assert.equal(result.overlayRect?.visible, true, `${label} overlay should be visible`);
  assert.equal(result.resumeRect?.visible, true, `${label} should show the resume button`);
  assert.ok((result.tacticalScanNodes ?? 0) >= 20, `${label} should render a tactical map`);
}

function fileHash(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
