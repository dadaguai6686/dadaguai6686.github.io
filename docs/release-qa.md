# 发布验收记录

本记录用于保存可提交的玩家端验收摘要。原始机器报告写入 `output/qa/release-browser-qa-summary-current.json`，但 `output/` 是本地临时输出目录，不随仓库提交。

## 最近一次验收

- 时间：2026-06-08 17:34 中国时间（`checkedAt: 2026-06-08T09:34:17.659Z`）
- 工具：Codex 内置浏览器
- 验收地址：`http://localhost:4173`（同一生产预览服务也允许 `http://127.0.0.1:4173`）
- 资源来源：`dist` 生产预览，同时由 `npm run test:dist` 校验生产资源为相对路径，并校验根目录 `assets/` 与 `dist/assets` 哈希一致
- 报告门禁：本机 `npm run qa:browser-report`
- 结果：通过

## 覆盖范围

| 场景 | 地址 | 视口 | 关键断言 |
| --- | --- | --- | --- |
| 桌面首屏 | `/` | `1440x900` | 中文四步目标、开始按钮、canvas、无横向溢出 |
| 桌面硬核首屏 | `/` | `1440x900` | 选择硬核后显示“无损起手 / 读图保命”，不再沿用标准模式 4 流明起手文案 |
| 桌面真实开局流程 | `/` | `1440x900` | 从可见开始按钮点击进入 `playing`，合约、路线教练、导航提示、目标条和非空 canvas 同步切换 |
| 桌面过波升级链路探针 | `/?qa=release&state=playthrough` | `1440x900` | `desktop-wave-upgrade-handoff-probe` 用正式 `updateSimulation` 规则清完第 1 波，并在 Codex 内置浏览器 DOM 中点击升级卡后进入第 2 波 |
| 桌面键盘输入探针 | `/?qa=release` | `1440x900` | `desktop-keyboard-input-probe` 调用本机发行 QA 模拟探针，验证读图缓冲结束、时间推进和玩家位置变化 |
| 桌面真实键盘输入 | `/?qa=release` | `1440x900` | `desktop-real-keyboard-input-probe` 从菜单真实点击开始，由 `#lumen-browser-input-probes` 自动记录前后签名，再用 Codex 内置浏览器键盘输入推动当前 Phaser 场景，结束后验证 `source: codex-in-app-browser-real-input`、`briefingEnded`、`elapsedDelta` 和 `positionDelta` |
| 手机竖屏首屏 | `/` | `390x844` | 中文四步目标、开始按钮、无横向溢出 |
| 手机竖屏开局 HUD | `/` | `390x844` | 进入游戏后合约要求、路线教练、导航提示均可见；摇杆、摇杆标签、修复/推进/脉冲按钮、暂停按钮可见且不与 HUD 重叠；无横向溢出 |
| 手机触控输入探针 | `/?qa=release` | `390x844` | `mobile-touch-input-probe` 调用本机发行 QA 模拟探针，验证触控方向输入会解除读图缓冲并移动玩家 |
| 手机真实触控输入 | `/?qa=release` | `390x844` | `mobile-real-touch-input-probe` 从菜单真实点击开始，由 `#lumen-browser-input-probes` 自动记录前后签名，再用 Codex 内置浏览器拖动 `#touch-stick` 推动当前 Phaser 场景，结束后验证 `action: codex-in-app-browser-touch-stick-drag`、`source: codex-in-app-browser-real-input`、`briefingEnded`、`elapsedDelta`、`positionDelta` 和真实移动后 `playfieldCenterClear: true` |
| 手机竖屏暂停扫描 | `/?qa=release&state=paused` | `390x844` | 暂停层为 `role="dialog"` / `aria-modal="true"`，继续按钮和战术扫描 SVG 节点可见 |
| 手机横屏首屏 | `/` | `844x390` | 压缩四步目标仍可见、开始按钮、无横向溢出 |
| 手机横屏开局 HUD | `/` | `844x390` | 进入游戏后合约要求、路线教练、导航提示均可见且不被 HUD 裁剪；摇杆、摇杆标签、修复/推进/脉冲按钮、暂停按钮可见且不与 HUD 重叠；无横向溢出 |
| 桌面暂停战术扫描 | `/?qa=release&state=paused` | `1440x900` | 本机 QA 入口激活、暂停层、继续按钮、战术扫描 SVG 节点 |
| 过波升级 | `/?qa=release&state=won` | `1440x900` | “光网稳定”结算、3 个升级选项、系统推荐、下一波预报、升级前后收益 |
| 通关结算 | `/?qa=release&state=completed` | `1440x900` | “五波完成”、结算指标、3 步下一局作战计划 |
| 失败复盘 | `/?qa=release&state=lost` | `1440x900` | “信号中断”、失误根因、下一局修正建议、3 步作战计划 |
| 生产预览 | `http://localhost:4173/?qa=release&state=won` | `1440x900` | `dist` 生产资源启动、canvas、升级推荐、无横向溢出 |

## 关键证据

- 原始报告路径：`output/qa/release-browser-qa-summary-current.json`。
- 所有场景 `passed: true`。
- 所有首屏、真实开局和 QA 场景均检测到 `canvasCount: 1`，且 canvas 尺寸匹配当前视口。
- 所有场景均写入 `#lumen-canvas-signature` 运行时画面签名，并记录 `canvasSignature`、`samples >= 96`、`colors >= 8`；签名优先使用可读 canvas 采样，若 Codex 内置浏览器只允许只读 DOM 证据，则使用 Phaser 场景对象数量、关键调色板、波次/区域/合约状态和视口尺寸组合，避免 canvas 黑屏、纯色或渲染层未启动时误判通过。
- 资源哈希证据：原始报告记录 `distAssetHashes`，并要求 `index.js`、`main.js`、`main.css`、`phaser.js` 与当前 `dist/assets` 哈希一致，避免拿旧报告证明新构建。
- 生产门禁证据：`npm run test:dist` 会验证 GitHub 子路径资源解析、生产拆包资源、根目录 `assets/` 同步和生产包体预算；`npm run qa:ship` 会串联规则测试、生产构建、dist 检查和本机 Codex 内置浏览器报告校验。
- `npm run qa:browser-report` 会校验原始报告中的场景覆盖、真实开局流程、过波升级链路探针、内置浏览器真实输入证据、关键 HUD 可见性、真实触控移动后的中心战场无遮挡、横屏 HUD 子元素裁剪范围、触控控件矩形、硬核首屏文案、复盘计划、升级选项和运行时画面签名证据。
- 输入探针证据：`desktop-keyboard-input-probe` 与 `mobile-touch-input-probe` 使用 `source: local-release-qa-simulation`。这是本机 `localhost` / `127.0.0.1` 且 `?qa=release` 下暴露的确定性模拟探针，运行时会写入 `#lumen-input-probes` 只读 JSON 证据节点，用同一套 `updateSimulation` 规则验证键盘/触控方向输入会结束 `briefingActive`、推进 `elapsedDelta`、产生 `positionDelta`；它不冒充 Codex 内置浏览器的物理键盘或拖拽输入。
- 内置浏览器真实输入证据：`desktop-real-keyboard-input-probe` 与 `mobile-real-touch-input-probe` 使用 `source: codex-in-app-browser-real-input`。本机 `?qa=release` 会在真实键盘或触控摇杆输入发生时自动记录当前 Phaser 场景签名，并把完成记录写入 `#lumen-browser-input-probes`；备用 hook `window.__lumenStartBrowserInputProbe()` / `window.__lumenFinishBrowserInputProbe()` 也保留给专门调试。报告必须先真实点击开局，再由 Codex 内置浏览器实际按键或拖动移动端 `#touch-stick`，最后验证 `briefingActive` 从 `true` 变为 `false`、`elapsedDelta > 0.05`、`positionDelta > 1`；手机真实触控还必须验证 `action: codex-in-app-browser-touch-stick-drag`，不能只点击动作按钮冒充移动摇杆。
- 桌面标准首屏 `desktop-standard-menu` 检测到 `selectedDifficulty: 标准`。
- 桌面硬核首屏 `desktop-hardcore-menu-after-click` 检测到 `selectedDifficulty: 硬核`、`launchFocusTitle: 无损起手`、`firstRouteTitle: 读图保命`，并确认首屏不再提示“4 个金色流明”作为硬核首波第一目标。
- 桌面真实开局 `desktop-real-start-flow` 检测到 `clickedStart: true`、`status: playing`、合约面板/路线教练/导航提示均为 `visible: true`，并检测到目标条和合约要求来自真实点击后的局内状态。
- 桌面过波升级链路探针 `desktop-wave-upgrade-handoff-probe` 检测到 `realPlaythrough` 证据：`source: local-release-qa-simulation-wave-upgrade`、`enteredStatus: playing`、`clearedWave: 1`、`repairedRelays: 4`、`elapsedSeconds: 26.567`、`upgradeOptions: 3`、`selectedUpgrade: pulse`、`upgradeClicked: true`、`postUpgradeStatus: playing`、`postUpgradeWave: 2`，证明正式规则层可以完成第一波，且浏览器 DOM 升级卡点击后能进入第 2 波。
- `1440x900`、`390x844`、`844x390` 首屏视口均检测到 `noHorizontalOverflow: true`。
- 手机竖屏开局 HUD `mobile-portrait-playing-hud` 与手机横屏开局 HUD `mobile-landscape-playing-hud` 均检测到合约要求、路线教练、导航提示为 `visible: true`，且位于 `hudRect` 可见范围内，并检测到 `playfieldCenterClear: true`，避免读图缓冲阶段隐藏、裁剪关键目标或遮住中心战场。
- 手机竖屏和横屏触控证据均检测到 `touchStickRect`、`touchStickLabelRect`、`touchRepairRect`、`touchBoostRect`、`touchPulseRect`、`mobilePauseRect` 均为 `visible: true`，`touchLabelWithinViewport: true`，`touchControlsClearOfHud: true`，并验证主要触控目标不小于 44px；本次 `390x844` 报告中竖屏开局 HUD 为 `282x162` 顶部短条，真实拖动摇杆后 HUD 为 `282x148`，`playfieldCenterClear: true`，`positionDelta: 51.49`，摇杆为 `118x118` 且顶部为 `714`、暂停按钮为 `64x44`，独立波次浮层在竖屏读图缓冲阶段收起；`844x390` 报告中 HUD 为 `588x108` 顶部短条，摇杆为 `92x92`，修复键为 `54x96`，推进/脉冲键均为 `54x44`，暂停按钮为 `64x44`，横屏紧凑态由合约、教练、导航三条短 HUD 承担目标说明，三者矩形均位于 `hudRect` 内。
- 手机竖屏暂停扫描 `mobile-portrait-paused-qa` 和桌面暂停扫描均检测到 `overlayRole: dialog`、`overlayAriaModal: true`、继续按钮可见，并检测到 `tacticalScanNodes: 23`。
- 过波升级和生产预览场景检测到 `upgradeOptions: 3`。
- 过波、通关、失败三个结算场景均在 `#recap-action-plan` 检测到 `recapPlanSteps: 3`；菜单里的 `#next-run-goals` 4 张目标卡单独计数，不混入结算复盘。
- 生产预览通过 `dist` artifact 中的构建资源启动。
- `dist/index.html` 的资源引用由 `npm run test:dist` 校验为相对路径，适配用户根站点、项目页和自定义域名。
- 根目录 `assets/` 与 `dist/assets` 的哈希一致性由 `npm run test:dist` 校验，用于本地/分支 Pages 兼容。

## 截图限制

按用户要求没有改用 Chrome 或桌面控制；本次没有触发外部浏览器，内置浏览器截图调用如需使用也必须留在 Codex 内置浏览器内。本次验收记录使用 Codex 内置浏览器会话中的 DOM、布局矩形、触控目标、真实点击开局状态、内置浏览器真实输入证据、过波升级链路探针、运行时画面签名证据和本机发行 QA 输入模拟探针；需要截图时，应继续优先使用 Codex 内置浏览器，如果截图 API 超时或断开，应在验收记录中明确说明限制。

## 复现入口

本机 `localhost` / `127.0.0.1` 支持以下验收状态：

- `?qa=release&state=paused`
- `?qa=release&state=won`
- `?qa=release&state=completed`
- `?qa=release&state=lost`
- `?qa=release&state=playthrough`

该入口只在本机域名激活，GitHub Pages 等非本机域名不会进入验收状态。
