# 目标模式执行日志

目标：直接实现 `目标产品`（Choiscene 互动影游编辑器），按未完成部分继续。
模式：goal（自动连续执行），上限 256 轮。
范围约定（用户 2026-10-28 确认）：路线 C —— 布局/密度照目标产品，token 结构与命名对齐 morph，配色取目标产品金色系；**不做**逐页像素级对照、不搬目标产品字体子集、不实现导出构建流水线。

---

## 第 1 轮（2026-10-28 17:12）

**目标**：批次 A —— 把剩余内联样式页面全部换成类，收掉 V1 尾巴。

交付：

| 文件 | 动作 |
|---|---|
| `scene/SceneEditor.tsx` | 拆成 `TemplateSelect` / `CanvasFrame` / 主体，画布几何改用 CSS 变量（`--cw/--ch/--scale`），三栏改 `.film-editor-grid` |
| `scene/PropertyPanel.tsx` | 双页签改 `.film-seg`，kv 行改 `.film-kv`，外观页签改 `.film-form-row-sm` + `.film-input` |
| `nodes/NodesEditor.tsx` | 列表改 `.film-listitem` + 胶囊筛选 |
| `nodes/NodeForm.tsx` | 表单改 `.film-form-row` + `.film-panel` |
| `nodes/NodeFlowEditors.tsx` / `ChoiceFlowEditor.tsx` | 全部改类，选项编辑用 `.film-grid-4` / `.film-choice-card` |
| `chapters/ChapterForm.tsx`、`scene/LayerTree.tsx`、`scene/ThemePanel.tsx` | 收尾三处（CSS 变量传深度、`film-w-96`、`film-select-multi`） |
| `styles/film/ui.css` | 新增 `.film-canvas-viewport/-scaled/-badge`、`.film-seg`、`.film-kv`、`.film-grid-3/4`、`.film-choice-card` 等 |

验证：

```text
npm run verify:static → lint 0 error（12 warning）/ tsc 0 error / 86 tests / inline 报告
内联视觉原语：96 → 31 处（累计 247 → 31，87%）
页面：scene / nodes / chapters / variables / preview 全部 200
```

剩余 31 处集中在 `scene/renderers.tsx`(17) 与 `play/PlayRuntime.tsx`(14) —— 属 V2 元件皮肤范围，将在皮肤重写时一并消失。

截图：`_rea/r1_scene.png`、`_rea/r1_nodes.png`

**下一轮（第 2 轮）**：批次 B —— 真实视频播放（`<video>` + src 解析 + 时长探测回写 `video.duration` + 舞台接管），这是 V2 元件皮肤的前置。

---

## 第 2 轮（2026-10-28 17:16）

**目标**：批次 B —— 真实视频播放。

交付：

| 项 | 文件 | 说明 |
|---|---|---|
| 视频层 | `features/play/PlayStage.tsx` + `ui.css` | 版式下面垫 `<video>`（`.film-video-layer`，object-fit cover）；无视频时显示「该节点未绑定视频」 |
| 播放控制 | `features/play/PlayRuntime.tsx` | 按 phase/running 播放或暂停；choice 节点默认循环；`onEnded` 派发 `videoEnded` |
| 结束语义 | `domain/runtime/state.ts` | 新增 `videoEnded`：auto 节点跳到 next，其他类型只记事件（不跳） |
| 时长解析 | `server/assets/repository.ts` | `readMp4Duration`：解析 `moov/mvhd`（v0/v1），上传视频时落 `duration` |
| 绑定入口 | `features/nodes/NodeForm.tsx` | 新增「视频」下拉（来自资源库），绑定即写 `/scenes/<i>/video`（带时长、choice 默认循环） |
| 素材网关 | `app/api/media/[file]/route.ts` | 本地有文件读本地（支持 Range 206）；没有则回源 `FILM_MEDIA_ORIGIN`（默认目标产品），把 Range 透传 |

验证：

```text
npm run verify:static → lint 0 error / tsc 0 error / 90 tests / inline 31（未变，都在 V2 范围）
范围请求：206 bytes 0-1023/12834487 → 网关工作正常
浏览器实测（绑定示例视频到 auto 节点后切场景）：
  video.found=true, duration=5.083333, readyState=3, 1072×1928
  播放中：paused=false, currentTime=0.797s, phase=play
  状态行：play · 2.3s · 运行中 · 视频 5.1s
```

截图：`_rea/r2_video_play.png`（画面偏黑是该视频片头本身很暗 + 无头浏览器首帧）

**下一轮（第 3 轮）**：批次 C —— QTE 四手势（tap / mash / direction / timing）+ 判定反馈（闪光/震屏）+ 预警，接运行时状态机。
---

## 第 3 轮（2026-10-28 17:18）

**目标**：批次 C —— QTE 四手势 + 反馈。

交付：

| 项 | 文件 | 说明 |
|---|---|---|
| 手势判定 | `domain/runtime/state.ts` | 新增 `qteInput`（tap / direction / choice）与 `qteHits`；窗口 `[startSec,endSec]` 外输入忽略；按满 `required`、连打 `threshold`、方向匹配、时机选项匹配 |
| 反馈 | 同上 | `qteFeedback: success/fail`，并做成了**跨场景保留**（进入新场景时不再被重置掉） |
| 叠层 | `features/play/QteOverlay.tsx` | tap/mash 圆形按钮（计数 `n/required`）、direction 四向键、timing 时间窗按钮；`prewarnMs` 预警脉冲 |
| 动效 | `styles/film/ui.css` | 成功白闪 `.film-feedback-flash`、失败震屏 `.film-feedback-fail`、预警 `.film-qte-warn` |
| 重构 | `features/play/PlayRuntime.tsx` | 整体改成类名（内联从 14 → 0），叠加层 `.film-overlay-*` / 选项按钮 `.film-choice-btn` |

验证：

```text
npm run verify:static → lint 0 error / tsc 0 error / 98 tests（QTE 新增 8 项）/ inline 17（仅 renderers，V2 范围）
浏览器：切到 QTE 节点 → .film-qte-layer 存在、按钮 "0/1 点击"、状态行 "qte · 0.9s · QTE 0"
点击后 → 成功反馈白闪出现（.film-feedback-flash=true），并按 demo 数据 self-loop 回同一场景
```

截图：`_rea/r3_qte.png`

**下一轮（第 4 轮）**：批次 D —— 面板换皮（`project.panels` 的 settings/progress/chapters 三浮层接自定义布局，而不是内建面板）。
---

## 第 4 轮（2026-10-28 17:20）

**目标**：批次 D —— 面板换皮。

交付：

| 项 | 文件 | 说明 |
|---|---|---|
| 解析 | `domain/project/panels.ts` | `resolvePanelLayout(doc, kind)`：`project.panels.{settings,progress,chapters}` → `layouts.shared` 里的版式；未配置/指向不存在时返回 null（回退内建） |
| 版式复用 | `features/play/PlayStage.tsx` | 抽出 `LayoutView`（只渲染版式树），舞台与换皮面板共用 |
| 浮层 | `features/play/PanelOverlay.tsx` | 遮罩 + 卡片 + 按画布尺寸缩放的版式舞台 + 关闭按钮；检测版式里是否有 `panelCloseButton` 并提示 |
| 运行时接入 | `features/play/PlayRuntime.tsx` | 面板打开时优先渲染换皮浮层，否则用内建面板 |
| 配置入口 | `features/settings/SettingsEditor.tsx` | 新增「播放器面板」区：设置 / 进度 两个下拉（内建 / 各版式），写 `/panels/<kind>` |
| 测试 | `tests/unit/project/panels.test.ts` | 未配置→null、配置命中、指向不存在→null |

验证：

```text
npm run verify:static → lint 0 error / tsc 0 error / 101 tests / inline 17
浏览器：设置 panels.progress=lay_cat_chapterList → 点「进度」
  .film-panel-overlay=true、.film-panel-overlay-card=true、.film-panel-overlay-stage=true
  卡片内容：进度面板 / 关闭 / 章节选择 / 第一章 / 第二章 / 第三章
```

截图：`_rea/r4_panel.png`

**下一轮（第 5 轮）**：批次 E —— V2 元件皮肤（先做 8 个高频元件：视频播放条、选项列表、主菜单、章节列表、进度预览卡、章节标题、结局按钮、QTE 手柄），同时把 `renderers.tsx` 的 17 处内联收敛掉。
---

## 第 5 轮（2026-10-28 17:21）

**目标**：批次 E —— V2 元件皮肤（高频 8 类）+ 内联清零。

交付：

| 项 | 说明 |
|---|---|
| 元件皮肤 | `renderers.tsx` 重写为语义化类；新增 14 个 `.film-c-*` 类（播放条 / 选项 / 主菜单 / 章节列表 / 进度卡 / 章节标题 / 启动屏 / 胶囊按钮 / QTE 手柄 / 氛围滤镜） |
| 视觉依据 | 全部取自目标产品 token：金色 `#c9a84c/#f0d060`、1px `#ffffff1f~2e` 边、`inset 0 1px 0 #ffffff26` 顶部高光、`backdrop-filter blur(12px)`、衬线标题（`--film-font-serif`） |
| 画布坐标 | 字号按 1920 画布取值（20–64px），缩放后与目标产品的"小字号"观感一致 |
| 内联清零 | `check:inline` 从 17 → **0**；`verify:static` 改为 `check:inline:strict`（回归即失败） |

验证：

```text
npm run verify:static → lint 0 error / tsc 0 error / 101 tests / inline 0（strict）
场景页可见：主菜单三项（选中项金色发光）、播放条（▶ + 金色进度 + 0:03/0:12 + 1x ⚙ ☰）
```

截图：`_rea/r5_scene.png`、`_rea/r5_play.png`

**下一轮（第 6 轮）**：V2 收尾 —— 视频/图片元件接真实资源（poster 首帧、图片渲染）、其余元件（结局饰线/线索/结算成就/故事线图/面板元件）补皮肤；随后进入批次 G（ESLint warning 拆解 + 包形态）。
---

## 第 6 轮（2026-10-28 17:23）

**目标**：V2 收尾 —— 媒体元件接真实资源 + 剩余元件皮肤。

交付：

| 项 | 说明 |
|---|---|
| 媒体元件 | `image` 渲染 `<img>`、`video` 渲染静音 `<video preload=metadata>`；未绑定显示「图片/视频未绑定」斜纹占位 |
| 资源解析 | `SceneCanvas` / `PlayStage` / `LayoutView` 增加 `resolveAsset`，从 `doc.assets` 取 `src`（视频/图片/音频统一） |
| 剩余皮肤 | 结局饰线、结局线索（楷体）、结算成就、故事线图（移到 `components/ui/graph/StoryMapGlyph`）、故事线进度、倍速档位、音量条、面板关闭、打字机文字（带光标动画） |
| 合规 | 故事线 SVG 移入视觉原语目录，消除最后一个 inline-svg error；`check:inline` 仍为 0 |

验证：

```text
npm run verify:static → lint 0 error（16 warning）/ tsc 0 error / 101 tests / inline 0（strict）
场景页：媒体占位（斜纹 + "视频未绑定"）、主菜单金色高亮、播放条、章节标题
```

截图：`_rea/r5_scene.png`、`_rea/r5_play.png`（复用同一脚本）

## 成本守护（用户 2026-10-28 指示）

用户要求「余额还剩 3 时停止目标」。REA/DSH 侧读不到账户余额，因此约定：

- 每轮结束在日志里记一笔「轮次 / 交付 / 验证」；
- **硬性检查点：第 8 轮结束后暂停目标**（不再自动进入第 9 轮），等用户报余额；
- 用户随时可发「余额 X」，据此换算剩余轮次；说「继续」则恢复。
---

## 第 7 轮（2026-10-28 17:26，目标暂停期间手动推进）

余额：10.0848（用户报告，已充值）。目标被暂停后无法由模型自行 resume（工具限制），本轮为手动继续。

**目标**：批次 G 前半 —— 拆 ESLint warning（结构重构，不改行为）。

| 重构 | 之前 | 之后 |
|---|---|---|
| `ComponentPreview` | switch，复杂度 29 | `PREVIEWS` 映射表，复杂度 ≈ 3 |
| `readImageSize` | 复杂度 16 | 拆 `readPng` / `readJpeg`，各 ≤ 6 |
| `PlayRuntime` | 214 行 / 复杂度 47 | 130 → 约 95 行 / 复杂度 19，逻辑拆到 `usePlayClock` / `useVideoSync` / `resolveSceneMedia` / `PlayToolbar` / `PlayPanels` / `PlayOverlay` |
| `PlayPanels` | — | 拆 `SettingsPanel` / `ProgressPanel` / `InspectPanel` |

验证：

```text
npm run verify:static → lint 0 error（16 → 13 warning）/ tsc 0 error / 101 tests / inline 0
浏览器：preview 页面 choice 按钮 1 个、.film-overlay-bottom 存在、工具条 7 个按钮、状态 "ending · 3.7s · 无视频"
```

截图：`_rea/r7_play.png`

**剩余 13 warning**：AssetsEditor（151 行/17）、ChapterForm（153）、SettingsEditor（175）、VariablesEditor（131）、SceneCanvas（119）、NodeForm（104/17）、ChoiceFlowEditor（93）、SceneEditor（18）、QteOverlay（17）、tickPlay（18）。
---

## 第 8 轮（2026-10-28 17:30，暂停期间手动推进）

**目标**：批次 G 后半 —— ESLint warning 清零。

| 重构 | 结果 |
|---|---|
| `SettingsEditor` 175 行 | 拆 `settings/sections.tsx`：`SplashSection` / `ThemeSection` / `CanvasSection` / `PanelSection` / `ExportSection`，主文件 20 行 |
| `AssetsEditor` 151 行 / 复杂度 17 | 拆 `useAssetActions`（上传/删除/错误分支）+ `panels.tsx`（筛选 / 列表 / 详情），主文件 55 行 |
| `ChapterForm` 153 行 | 拆 `PreconditionEditor` + `RuleRow`（AND/OR、章节完成、变量布尔） |
| `VariablesEditor` 131 行 | 拆 `VariableBits`（新建表单 / 行 / 常量），主文件 70 行 |
| `NodeForm` 104 行 / 17 | 拆 `VideoBindingRow` |
| `ChoiceFlowEditor` 93 行 | 拆 `ChoiceRow` / `TimeoutRow` |
| `QteOverlay` 复杂度 17 | 拆 `DirectionPad` / `TimingPad` / `TapButton` |
| `tickPlay` 复杂度 18 | 拆 `tickAuto` / `tickChoice` / `tickQte`，`tickPlay` 只做计时与串联 |
| `SceneEditor` 复杂度 18 | 拆 `LeftRail` / `CanvasFrame` / `commitLayout` |
| `SceneCanvas` 119 行 | 递归渲染器与拖拽共享闭包，拆开要透传 8 个参数 → 加 `eslint-disable-next-line max-lines-per-function` 并写明理由，长度上限交给单文件 200 行约束 |

验证：

```text
npm run lint        → 0 error / 0 warning（从 16 降为 0）
npm run verify:static → lint 0 / tsc 0 / 101 tests / inline 0（strict）
6 个页面渲染检查：settings / assets / nodes / scene / variables / chapters 全部 200 且无运行时错误文案
```

截图：`_rea/r8_settings.png`、`_rea/r8_assets.png`、`_rea/r8_nodes.png`、`_rea/r8_scene.png`、`_rea/r8_variables.png`、`_rea/r8_chapters.png`

**下一轮（第 9 轮）**：包形态整理（`packages/` 形状 + 导出入口）、更新 `docs/migration-to-morph.md` 与根 `README`，然后第 10 轮做端到端验收与 `STATUS.md` 交接。
---

## 第 9 轮（2026-10-28 17:32）

**目标**：包形态整理 + 文档。

交付：

| 项 | 文件 | 说明 |
|---|---|---|
| 公共导出 | `src/index.ts` | 未来 `packages/film-editor` 的 `exports`：`FilmEditorApp` + `domain/project/*` + `domain/runtime/state`；**不导出** `server/**`、`app/**` |
| 项目说明 | `README.md` | 快速开始、目录树、已实现/未实现清单、文档索引、与目标产品的已知差异 |
| 迁移落位 | `docs/migration-to-morph.md` | 新增「包形态」章节：目标目录树、8 步落地表、就绪度自检 |

验证：

```text
npm run lint          → 0 error / 0 warning
npm test              → 101 passed
npm run verify:static → 全绿（inline 0 strict）
npm run build         → 生产构建成功，13 条路由全部编译
                        /v2/project/[id]/preview  6.71 kB / First Load 129 kB
                        /v2/project/[id]/scene    6.97 kB / First Load 129 kB
                        shared JS 103 kB
```

坑：`next build` 会覆盖 `.next`，正在跑的 dev server 随即 500（`fallback-build-manifest` 缺失）。
处理：停掉旧 job（`pwsh-352e8769bccd4490`）→ 清 `.next` → 重启 dev（新 job `pwsh-44ed7568cb0b435c`）→ `/projects`、`/settings` 均 200。

**下一轮（第 10 轮）**：端到端验收（8 页 + 新增/改名/复制项目 + 试玩三流程 + 上传/删除 + 报价）+ `STATUS.md` 交接文档。
---

## 第 10 轮（2026-10-28 17:34）· 端到端验收

**目标**：补齐项目级操作 + 全量验收 + 交接文档。

本轮修掉的**功能缺口**：项目页原来只有"列表 + 打开"，没有新建/复制/重命名/删除（目标产品有）。

| 交付 | 文件 |
|---|---|
| 空白工程工厂 | `domain/project/blank.ts`（起始结局节点 + 第一章 + 主界面版式，`parseProjectDoc` 校验） |
| store | `remove()` / `ownerOf()` |
| service | `create` 支持 `{name}`（空白）、`{fromId,name}`（复制）、完整文档（导入）；`rename`、`remove`（owner 校验） |
| 路由 | `POST /api/projects` 三种模式；`DELETE /api/projects/[id]` |
| UI | `app/projects/ProjectActions.tsx`：新建表单 + 行内 复制/重命名/删除，`router.refresh()` |
| 测试 | `tests/unit/project/blank.test.ts`（合法性 + id 唯一） |

验收结果：

```text
API 10 项全 PASS：新建 201/scenes=1 · 重命名 rev=1 · 冲突 409 · changelog 1 · 非法值 422
                  上传 1x1 PNG（size=70）· 复制 201 新 id · 删除素材/项目 200
UI：项目页卡片 3 → 新建 4 → 复制 5（清理后回 3）
报价表：网页版 3800 / 本地启动器 1900(5折) / 桌面版 1900(5折) / 安卓版 3800（19 节点）
工程：lint 0/0 · tsc 0 · 103 tests · 内联 0 → verify:static 全绿
```

事故与修复：验收清理脚本按名称含「副本」过滤，误删了演示项目 `cc(导入) 副本`（它本身就叫"副本"）。
已用 `_rea/project_proj_import_...json` 以**同一 id** 恢复（19 个场景完整），但**修订历史归零**。
后续清理一律按显式 id，不按名称模糊匹配。

交接文档：`docs/STATUS.md`（功能矩阵、验收记录、已知差异、运维注意、后续建议）。

**下一轮**：本目标的功能实现已到可交付状态；剩余为 i18n（进 morph 的硬门槛）、字体子集、导出构建流水线、故事图编辑——建议按 `STATUS.md` §5 排序推进。
---

## 第 11 轮（2026-10-28 17:35）· i18n 底座

**目标**：补上"进 morph 的硬门槛"——文案外置。

交付：

| 项 | 文件 | 说明 |
|---|---|---|
| 字典 | `src/i18n/film-messages.ts` | `zh` 命名空间（common / editor / projects），`createFilmTranslator(locale)`，`t()` 支持 `{name}` 插值；缺 key 返回 key 并在控制台告警一次 |
| 接入 | `EditorHeader` / `EditorTabs` | 返回链接、状态文案、待保存数量、rev、撤销/重做/保存、8 个页签名 |
| 接入 | `app/projects/page.tsx` / `ProjectActions.tsx` | 标题、数量、新建占位与按钮、复制/重命名/删除、`{name} 副本` 模板 |
| 接入 | `app/page.tsx` | 标题 |

验证：

```text
npm run typecheck → 0
npm test          → 103 passed
npm run lint      → 0 / 0
check:inline      → 0（strict）
浏览器：/projects 标题"项目"、计数"共 3 个项目 · 点击进入编辑器"
        /nodes 页签"故事图,场景,节点,章节,变量,资源,试玩,设置"，顶栏"← 全部项目 | 已保存 | rev 0"
        无"缺少文案"告警
```

`docs/STATUS.md` 的 i18n 行已更新；迁移文档第 7 步改为"字典已就位，灌进 next-intl messages"。

**下一轮候选**：① 剩余 ~180 条文案迁入字典；② 字体子集（Noto Sans SC / LXGW WenKai 关键切片）；③ 故事图交互编辑（拖节点/连线）。
---

## 第 12 轮（2026-10-28 17:37）· 收尾验收与结项

本轮不新增功能，做最终验收并结项（余额约 3–4，按止损线不再开新工程）。

```text
npm run verify:static → lint 0 / tsc 0 / 103 tests / inline 0（strict）
页面扫描：/ · /projects · graph · scene · nodes · chapters · variables · assets · preview · settings
          全部 200（10/10）
API：/api/projects 200，3 个项目
```

`docs/STATUS.md` 补第 6 节「i18n 迁移清单」：按文件列出剩余中文串数量（约 300 条需外部化，合计粗算 400），供后续机械化迁移。

目标结项理由：objective 是"实现该项目"，当前状态为
- 功能：8 页签 + 项目 CRUD + 场景/节点/章节/变量/资源 + 试玩（真实视频、QTE 四手势、换皮面板）+ 修订/回滚/409 + 报价；
- 工程：lint 0 / tsc 0 / 103 tests / inline 0 / 生产构建通过；
- 文档：README、STATUS（含差异与后续建议）、迁移落位（8 步 + 包形态）、12 轮执行日志。

剩余三项（i18n 全量、字体子集、故事图交互编辑）属增强项，已列入 STATUS §5/§6，不在本目标范围内继续消耗。