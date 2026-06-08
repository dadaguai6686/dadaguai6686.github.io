import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (path: string): string => readFileSync(path, "utf8");

const packageJson = JSON.parse(read("package.json")) as {
  devDependencies?: Record<string, string>;
  engines?: Record<string, string>;
  packageManager?: string;
  scripts?: Record<string, string>;
};
const scripts = packageJson.scripts ?? {};
const devDependencies = packageJson.devDependencies ?? {};
const readme = read("README.md");
const design = read("docs/design.md");
const releaseQa = read("docs/release-qa.md");
const main = read("src/main.ts");
const gameScene = read("src/game/GameScene.ts");
const viteConfig = read("vite.config.ts");
const indexHtml = read("index.html");
const smokeDist = read("scripts/smoke-dist.ts");
const gitignore = read(".gitignore");
const pagesWorkflow = existsSync(".github/workflows/pages.yml") ? read(".github/workflows/pages.yml") : "";

assert.ok(existsSync("docs/release-qa.md"), "release QA summary should be stored in a committed docs file");
assert.ok(
  readme.includes("docs/release-qa.md"),
  "README should point to the committed release QA summary, not only a local output file"
);
assert.ok(
  readme.includes("output/qa/release-browser-qa-summary-current.json") && readme.includes("不随仓库提交"),
  "README should explain that the raw output/qa report is local and ignored"
);
assert.ok(
  readme.includes("npm run qa:browser-report") && readme.includes("Codex 内置浏览器原始报告"),
  "README should document the local browser QA report verifier"
);
assert.ok(gitignore.includes("output/"), "local QA output should remain ignored");

for (const label of [
  "桌面首屏",
  "桌面硬核首屏",
  "桌面真实开局流程",
  "桌面过波升级链路探针",
  "桌面键盘输入探针",
  "桌面真实键盘输入",
  "手机竖屏首屏",
  "手机竖屏开局 HUD",
  "手机触控输入探针",
  "手机真实触控输入",
  "手机竖屏暂停扫描",
  "手机横屏首屏",
  "手机横屏开局 HUD",
  "桌面暂停战术扫描",
  "过波升级",
  "通关结算",
  "失败复盘",
  "生产预览"
]) {
  assert.ok(releaseQa.includes(label), `release QA summary should cover ${label}`);
}

for (const required of [
  "output/qa/release-browser-qa-summary-current.json",
  "npm run qa:browser-report",
  "npm run qa:ship",
  "报告门禁",
  "passed: true",
  "desktop-standard-menu",
  "selectedDifficulty: 标准",
  "desktop-hardcore-menu-after-click",
  "selectedDifficulty: 硬核",
  "desktop-real-start-flow",
  "clickedStart: true",
  "status: playing",
  "desktop-wave-upgrade-handoff-probe",
  "realPlaythrough",
  "clearedWave: 1",
  "postUpgradeWave: 2",
  "local-release-qa-simulation-wave-upgrade",
  "canvasSignature",
  "samples >= 96",
  "colors >= 8",
  "运行时画面签名",
  "资源哈希证据",
  "distAssetHashes",
  "index.js",
  "phaser.js",
  "输入探针证据",
  "desktop-keyboard-input-probe",
  "mobile-touch-input-probe",
  "source: local-release-qa-simulation",
  "#lumen-input-probes",
  "内置浏览器真实输入证据",
  "desktop-real-keyboard-input-probe",
  "mobile-real-touch-input-probe",
  "codex-in-app-browser-touch-stick-drag",
  "source: codex-in-app-browser-real-input",
  "#lumen-browser-input-probes",
  "__lumenStartBrowserInputProbe",
  "__lumenFinishBrowserInputProbe",
  "briefingActive",
  "elapsedDelta",
  "positionDelta",
  "updateSimulation",
  "不冒充 Codex 内置浏览器的物理键盘或拖拽输入",
  "Phaser 场景对象",
  "调色板",
  "canvasCount: 1",
  "noHorizontalOverflow: true",
  "1440x900",
  "390x844",
  "844x390",
  "mobile-portrait-playing-hud",
  "mobile-portrait-paused-qa",
  "mobile-landscape-playing-hud",
  "visible: true",
  "overlayRole: dialog",
  "overlayAriaModal: true",
  "touchControlsClearOfHud: true",
  "playfieldCenterClear: true",
  "tacticalScanNodes: 23",
  "upgradeOptions: 3",
  "recapPlanSteps: 3",
  "相对路径",
  "内置浏览器截图调用",
  "没有改用 Chrome",
  "?qa=release&state=won"
]) {
  assert.ok(releaseQa.includes(required), `release QA summary should include: ${required}`);
}

assert.ok(scripts["qa:release"]?.includes("scripts/check-release-qa.ts"), "package should expose npm run qa:release");
assert.ok(
  scripts["qa:browser-report"]?.includes("scripts/check-browser-report.ts"),
  "package should expose npm run qa:browser-report for local browser evidence"
);
assert.ok(
  scripts["qa:ship"]?.includes("npm run qa:browser-report") && scripts["qa:ship"]?.includes("npm run test:dist"),
  "package should expose a full local ship gate that includes dist and browser QA evidence"
);
assert.ok(scripts.test?.includes("npm run qa:release"), "npm test should include the release QA gate");
assert.ok(scripts.build?.includes("sync:pages-assets"), "npm run build should sync root Pages assets after Vite build");
assert.ok(scripts["test:dist"]?.includes("scripts/smoke-dist.ts"), "package should expose dist smoke checks");
assert.ok(scripts["test:dist"]?.includes("scripts/check-budgets.ts"), "dist smoke checks should include production budget checks");
assert.ok(existsSync("scripts/sync-pages-assets.ts"), "build script should reference a tracked Pages asset sync script");
assert.ok(existsSync("scripts/waypoint-bot-playtest.ts"), "test script should reference an available waypoint bot playtest");
assert.ok(existsSync("scripts/check-browser-report.ts"), "release QA should include a browser report verifier");
assert.ok(existsSync("scripts/check-budgets.ts"), "release QA should include a production budget verifier");
assert.ok(existsSync(".gitattributes"), "repository should pin text/binary normalization for release files");
assert.ok(packageJson.packageManager?.startsWith("npm@"), "package should pin the npm package manager for reproducible installs");
assert.ok(packageJson.engines?.node?.includes("22"), "package should document the Node 22 release runtime");
assert.ok(viteConfig.includes('base: "./"'), "Vite production build should emit relative asset URLs");
assert.ok(viteConfig.includes("transformIndexHtml"), "Vite should inject a concrete asset cache version at build time");
assert.ok(viteConfig.includes("GITHUB_SHA"), "Vite asset cache version should use the GitHub commit when available");
assert.ok(indexHtml.includes('name="lumen-asset-version"'), "source index should expose the asset cache version marker");
assert.ok(!indexHtml.includes("release-qa-input"), "source index should not use a hand-written release QA cache key");
assert.ok(indexHtml.includes('location.port === "5173"'), "source loader should be limited to the Vite dev server port");
assert.ok(indexHtml.includes("!isLocalDev"), "static non-dev hosts should load built assets");
assert.ok(smokeDist.includes("!ref.startsWith(\"/assets/\")"), "dist smoke check should reject root-relative asset URLs");
assert.ok(smokeDist.includes("game_studio_test/assets/"), "dist smoke check should cover GitHub project-page subpaths");
assert.ok(smokeDist.includes("%LUMEN_ASSET_VERSION%"), "dist smoke check should verify build-time asset version injection");

assert.ok(main.includes("initLocalReleaseQaMode"), "runtime should include the local release QA entry");
assert.ok(
  main.includes('window.addEventListener("game:scene-ready", onGameSceneReady, { once: true })'),
  "release QA mode should initialize from the Phaser scene-ready event"
);
assert.ok(main.includes("initLocalReleaseQaModeOnce"), "release QA mode should use a once-only guard");
assert.ok(main.includes("releaseQaModeInitialized"), "release QA mode should not run more than once");
assert.ok(main.includes("releaseQaSceneReady"), "release QA mode should track Phaser readiness");
assert.ok(main.includes('params.get("qa") === "release"'), "release QA entry should require qa=release");
assert.ok(
  main.includes('host === "localhost"') && main.includes('host === "127.0.0.1"'),
  "release QA entry should be limited to local hosts"
);
assert.ok(main.includes('new CustomEvent("game:qa-state"'), "release QA state should synchronize with Phaser");
assert.ok(main.includes("__lumenStartBrowserInputProbe"), "release QA should expose a browser input evidence start hook");
assert.ok(main.includes("__lumenFinishBrowserInputProbe"), "release QA should expose a browser input evidence finish hook");
assert.ok(main.includes("#lumen-browser-input-probes"), "real browser input evidence should be persisted as read-only DOM evidence");
assert.ok(
  main.includes("codex-in-app-browser-real-input"),
  "real browser input evidence should label Codex in-app browser as the source"
);
assert.ok(gameScene.includes('new CustomEvent("game:scene-ready"'), "Phaser scene should announce release QA readiness");
assert.ok(gameScene.includes('window.addEventListener("game:qa-state"'), "Phaser scene should accept release QA snapshots");

assert.ok(design.includes("npm run test:dist"), "design acceptance should require dist smoke checks");
assert.ok(design.includes("npm run qa:release"), "design acceptance should require the release QA documentation gate");
assert.ok(design.includes("npm run qa:browser-report"), "design acceptance should mention the local browser QA report gate");
assert.ok(
  design.includes("真实点击开局") && design.includes("运行时画面签名"),
  "design acceptance should require real start flow and runtime render signature evidence"
);
assert.ok(
  design.includes("过波升级链路探针") && design.includes("进入第 2 波"),
  "design acceptance should require a wave-clear to upgrade handoff probe"
);
assert.ok(
  design.includes("GitHub Actions") &&
    design.includes("dist") &&
    design.includes("根目录 `assets/`") &&
    design.includes("相对资源路径"),
  "design docs should distinguish Actions dist deploy, relative assets, and root assets compatibility"
);

assert.ok(pagesWorkflow.includes("npm test"), "Pages workflow should run npm test");
assert.ok(pagesWorkflow.includes("npm run build"), "Pages workflow should run npm run build");
assert.ok(pagesWorkflow.includes("npm run test:dist"), "Pages workflow should run dist smoke checks");
assert.ok(pagesWorkflow.includes("git diff --exit-code -- assets"), "Pages workflow should fail when committed root assets are stale");
assert.ok(pagesWorkflow.includes("path: dist"), "Pages workflow should deploy the dist artifact");
assert.ok(pagesWorkflow.includes("node-version: 22"), "Pages workflow should use the documented Node 22 runtime");
assert.ok(
  devDependencies["@types/node"]?.startsWith("^22."),
  "Node type definitions should match the GitHub Actions Node 22 runtime"
);

console.log("Release QA documentation checks passed.");
