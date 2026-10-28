# 实现状态交接（STATUS）

日期：2026-10-28
基线：`npm run verify:static` 全绿（lint 0 / tsc 0 / **103 tests** / 内联 0 strict）

## 1. 功能矩阵（对照 `_rea/UI_INVENTORY.md` 的 97% 清单）

| 模块 | 状态 | 证据 |
|---|---|---|
| 项目列表 / 新建 / 复制 / 重命名 / 删除 | ✅ | UI 实测：卡片 3 → 新建后 4 → 复制后 5；API 全流程 PASS |
| 故事图（分层布局 + 边 + 点击进入场景） | ✅ | `/v2/project/[id]/graph` 200，布局单测覆盖 |
| 场景编辑器（画布缩放、图层树、拖拽、右下角缩放、锚点） | ✅ | 拖拽/锚点单测 + 画布截图 |
| 属性面板（内容/外观双页签、绑定表达式、样式三级回退） | ✅ | `PropertyPanel` + `style.test` |
| 配色（3 套预设 + 4 个 token + 画布尺寸/字体预设） | ✅ | 设置页截图 |
| 节点编辑（auto / choice / qte / menu / ending / settlement） | ✅ | `NodeForm` + 各 FlowEditor |
| QTE 四手势（tap / mash / direction / timing） | ✅ | 8 项单测 + 浏览器实测点击 |
| 章节（AND/OR 解锁条件、章节完成/变量规则） | ✅ | `PreconditionEditor` + 单测 |
| 变量（类型/作用域/默认值、`${var.x}` 提示） | ✅ | 变量页截图 |
| 资源（上传、尺寸/时长探测、引用检查、删除） | ✅ | 1×1 PNG 上传 → 1×1 size=70 → 删除 200 |
| 试玩（状态机、真实视频、变量持久化、换皮面板） | ✅ | 视频 duration=5.083、`paused=false`、`currentTime=0.797` |
| 面板换皮（settings/progress 指向版式） | ✅ | 进度面板实测渲染出章节列表 |
| 修订历史 / 回滚 / 409 冲突 | ✅ | 409 实测、changelog 接口 |
| 导出报价 | ✅（不构建） | 19 节点 → 网页 3800 / 本地 1900（5 折）/ 桌面 1900（5 折）/ 安卓 3800 |

## 2. 验收记录

### API（`_rea/r10_api.mjs`，10 项全 PASS）

```
新建项目（空白模板） 201  scenes=1
重命名 200 rev=1
乐观锁 409
修订历史 revisions=1
非法值被拒 422
上传图片（含尺寸探测）1x1 size=70
复制项目 201  new≠old
删除素材 200 / 删除项目 200 / 删除自身 200
```

### 页面（CDP 渲染检查）

```
/projects  → 200，3 张卡片
/v2/project/[id]/{graph,scene,nodes,chapters,variables,assets,preview,settings} → 全部 200
settings 报价表：网页版 3800 / 本地启动器 1900(5折) / 桌面版 1900(5折) / 安卓版 3800
```

### 工程

```
npm run lint          → 0 error / 0 warning
npm run verify:static → 全绿
npm run build         → 13 条路由，preview 6.71 kB / First Load 129 kB，shared 103 kB
```

## 3. 已知差异 / 未实现

| 项 | 说明 |
|---|---|

| 字体 | 目标产品 2122 个 woff2 子集未搬，用系统字体栈兜底 |
| i18n | 底座已就位（`src/i18n/film-messages.ts`：zh 字典 + `t()` 带插值/缺失告警），已接顶栏、页签、项目页、首页标题；其余页面文案仍为硬编码 |
| COS/VOD 直传 | 只做本地上传 + 媒体网关回源 |
| 素材标签 / 批量绑定 | 未实现 |
| mp4 时长手改入口 | 上传时自动解析 `mvhd`；解析失败（fMP4）只能显示"时长未知" |
| 故事图交互编辑（拖节点/加边） | 只读视图 |

## 4. 运维注意

- **dev server**：后台 job `pwsh-44ed7568cb0b435c`，绑定 `127.0.0.1:3080`。
- **`npm run build` 会覆盖 `.next`**，正在跑的 dev server 会 500；先停 dev 再构建。
- **演示数据**在 `data/projects/`（gitignore）。三个 fixture 在 `../_rea/project_*.json`，可随时用 `POST /api/projects`（完整文档）恢复，**注意这会重置该项目修订历史**。
- 清理脚本按名称过滤有风险：本次验收误删了演示项目 `cc(导入) 副本`（它本身就叫"副本"），已用 fixture 同 id 恢复，修订历史归零。

## 5. 后续建议（按收益排序）

1. **接 morph**：按 `docs/migration-to-morph.md` 的 8 步落地，先跑 `verify:static` 对齐守卫。
2. **i18n**：底座已有（`t()` + zh 字典），把剩余页面文案迁进 `film.*`（约 180 key），再换成 next-intl 的 messages。
3. **导出构建**：若真要"能导出作品"，需要一条 `next build` + 静态打包 + 产物 zip 的流水线。
4. **字体**：搬 `Noto Sans SC` + `LXGW WenKai` 的关键子集，视觉会再进一步。
5. **故事图编辑**：拖节点、连线、右键菜单，向目标产品看齐。

## 6. i18n 迁移清单（按文件，粗算 2 字以上中文串）

已接入字典：`editor/*`（顶栏、页签）、`projects/*`、首页标题 —— 见 `src/i18n/film-messages.ts`。

剩余（建议按此顺序机械化迁移，每文件迁完跑一次 `verify:static`）：

| 文件 | 串数 | 文件 | 串数 |
|---|---|---|---|
| `features/settings/sections.tsx` | 43 | `features/scene/PropertyPanel.tsx` | 27 |
| `features/scene/renderers.tsx` | 34 | `features/story-graph/StoryGraphView.tsx` | 26 |
| `features/nodes/NodeFlowEditors.tsx` | 31 | `features/nodes/NodesEditor.tsx` | 21 |
| `features/play/PlayChrome.tsx` | 31 | `features/variables/VariableBits.tsx` | 20 |
| `features/assets/panels.tsx` | 20 | `features/nodes/NodeForm.tsx` | 19 |
| `features/scene/SceneCanvas.tsx` | 14 | `features/variables/VariablesEditor.tsx` | 14 |
| `features/chapters/*`（3 文件） | 34 | `features/nodes/ChoiceFlowEditor.tsx` | 13 |
| `features/scene/ThemePanel.tsx` | 11 | `features/play/{PanelOverlay,PlayStage}` | 20 |

合计约 **400** 处（含少量注释/开发者文案，实际需外部化约 300）。

注意：`renderers.tsx` 里的中文是**元件预览占位文案**（"选项 1""开始游戏"），属于示例内容，可保留为常量或加 `sample.*` 命名空间。
---

## 7. V4 界面重构（按目标产品逐页对齐）

用户指出"页面完全不一样"，确认此前只做了 token 级配色对齐，没有做布局/外壳/组件形态。V4 按目标产品截图逐页重做。

### 已完成（V4-1）

| 项 | 说明 |
|---|---|
| 全站外壳 | `components/app-shell/AppShell.tsx`：左侧悬浮图标栏（首页/项目/Verse/素材库）、右上角账户区（礼物/通知/⚡264/头像）、`app-body` 铺满暗色渐变底 |
| 首页 | 品牌标识（Choiscene + 副标）、主视觉标题、圆角输入框（模型选择 chip / 上传 / 发送）、最近项目网格 + "导入项目/更多项目" |
| 项目页 | 与首页同一套卡片网格：`+ 新建项目` 卡片、16:9 缩略图占位（播放水印）、`…` 菜单（复制/重命名/删除）、"编辑于 N 分钟前" |
| 样式 | `styles/film/shell.css`（`.app-*` 约 30 个类） |
| 顺带清理 | 删除 E2E 遗留的重复项目（按显式 id），修掉 AppBrand 的非法嵌套（`div` 套在 `span` 里导致 hydration 报错） |

验证：`tsc 0 / lint 0 / inline 0`；两页 200，`.app-rail`、`.app-topbar`、`.app-card` 均存在；控制台无错误。

截图：`_rea/v4_home.png`、`_rea/v4_projects.png`

### V4-2 已完成

| 项 | 说明 |
|---|---|
| 悬浮顶栏 | `.ed-topbar`：返回胶囊（‹ / 项目名可改）+ 保存态 + 右侧 rev/撤销/重做/保存 |
| 居中胶囊页签 | `.ed-tabs-float`：8 个页签居中悬浮，激活项浅色胶囊 |
| 左浮动工具条 | `.ed-rail`：新增节点（+，白底）/ 搜索 / 撤销 |
| 底部缩放条 | `.ed-zoom`：− / 百分比 / + / 适应 / 1:1，接 `zoomStore`，故事图（默认 80%）与场景（42%）实时联动 |
| 留白 | `.ed-stage` 统一 74px 顶 / 92px 左，避开悬浮元素 |

### V4-3 已完成（故事图节点卡）

| 项 | 说明 |
|---|---|
| 节点卡 | 200×152：顶部 16:9 缩略区（用 `LayoutView` 按画布 4.58% 缩放真实渲染版式）+ 类型 chip + 标题 + id/元信息 |
| 状态点 | 右上彩色圆点按 flow 类型着色（播放/选择/QTE/结局/菜单/结算） |
| 画布 | 深色 + 22px 点阵网格，节点不再重叠（行距 = 节点高 + 36） |
| 连线 | 金色曲线（沿用 EdgeLayer） |

踩坑：把 `resolveAsset` 函数作为 prop 从服务端组件传给客户端 `LayoutView` 会直接 500（"Functions cannot be passed directly to Client Components"）。解决：`StoryGraphView` 整体标 `"use client"`，函数只在客户端之间传递。

### V4-3b 已完成（项目卡真实缩略图）

- `domain/project/preview.ts`：`buildProjectPreview(doc)` 只取「起始场景的版式 + 画布尺寸 + 主题」，避免把整份 doc 传到客户端；
- `components/app-shell/ProjectThumb.tsx`：把版式按 216/1920 缩放渲染，卡片里显示**真实内容**而不是占位水印；
- 首页与项目页都改为传 `previews`（每项目一次 doc 读取）；
- 卡片网格固定 216px 宽，缩略图比例稳定。

### V4-4 已完成（交互与浮动面板）

| 项 | 说明 |
|---|---|
| 场景浮动面板 | 左：图层树 + 配色（`.ed-float-left`）；右：属性（`.ed-float-right`）；中间画布区 `.ed-scene-stage` |
| 故事图拖节点 | 指针拖拽移动节点，连线随坐标实时重算；位置只在本会话有效（与目标产品一致，不入库） |
| 平移 | 拖空白处平移整张图（`.ed-graph-inner` translate） |
| 缩放 | Ctrl/⌘ + 滚轮缩放，与底部缩放条共享 `zoomStore` |

### 仍未做

| 项 | 差距 |
|---|---|
| 连边编辑 | 只能拖节点，不能拉线新增/删除边（目标产品可右键菜单） |
| 节点右键菜单 | 无 |
| 缩略图快照 | 卡片缩略图是版式渲染，不是视频截帧 |
| 首页细节 | 左栏图标形状、输入框附件按钮间距、头像徽标 |
---

## 8. V4-5 四个内页卡片化（本轮）

| 页面 | 之前 | 现在 |
|---|---|---|
| 节点 | 左列表 + 右表单，纯文字行 | 19 张节点卡（类型 chip / START / 结局 / 无视频 + 标题 + id），右侧玻璃表单面板 |
| 章节 | 列表 + 表单 | 章节卡（序号 chip / 起始章 / 停用）+ 右侧面板 |
| 资源 | 三栏列表 | **素材卡片网格**（16:9 缩略：图片走 `/api/media` 直出、视频/音频用图标）+ 右侧详情面板 |
| 变量 | 表格 + 左侧表单 | 左「新建变量」面板 + 右表格面板，统一 `PageHeader` |

共用样式：`.pg-head / .pg-layout / .pg-card / .pg-panel / .pg-media-grid`；共用组件 `components/ui/PageHeader.tsx`。

验证：`tsc 0 / lint 0 / inline 0 / 103 tests`；四页 200，卡片与面板结构就位。

## 9. 实现完成度自评（2026-10-28 18:10）

| 维度 | 权重 | 完成度 | 说明 |
|---|---|---|---|
| 视觉一致性 | 30% | 60% | 首页/项目页/故事图/场景页 70–80%；节点/章节/变量/资源 已卡片化到 ~60%；设置/试玩 ~50% |
| 功能覆盖 | 30% | 78% | 缺导出构建、故事图连边编辑、素材标签、COS/VOD |
| 交互 | 15% | 62% | 拖拽/缩放/平移/QTE 有；缺连边、右键菜单、快捷键 |
| 工程门禁 | 15% | 85% | lint/tsc/tests/inline/build 全绿 |
| 后端与认证 | 10% | 45% | 本地文件存储 + 媒体网关；无 COS/VOD/Verse/构建服务，认证是桩 |

**加权 ≈ 66%**（上一轮评估 57%，V4 系列把它抬了约 9 个百分点）。
---

## 10. V4-6 设置页两列卡片 + 试玩播放器外壳

| 项 | 之前 | 现在 |
|---|---|---|
| 设置页 | 5 个整宽面板纵向堆叠 | `PageHeader` + `.pg-grid-2` 两列卡片（开场 / 配色 / 画布 / 播放器面板 / 导出报价） |
| 试玩 | 顶部工具条 + 两栏（画布 + 侧栏） | **居中画布**（`.pg-player-stage`，16px 圆角 + 投影）+ 顶部状态 chip + **底部悬浮控制条**（↺ / 暂停 / 倍速 0.5–2x / 跳场景 / 检查 / 设置 / 进度）；面板改为右侧浮动卡 |

重构中把控制条与状态 chip 抽到 `PlayChrome.tsx`（`PlayControlBar` / `PlayStatusChip`），`PlayRuntime` 回到 85 行以内，内联违规保持 0。

验证：`tsc 0 / lint 0 / inline 0 / 103 tests`；预览页 `.pg-player-bar`、`.pg-player-chip` 均存在；设置页 5 个卡片 section。

自评（本轮后）：视觉 ~68%、功能 78%、交互 65%、工程 85%、后端 45% → **加权 ≈ 70%**。
---

## 11. V4-7 故事图连线编辑（本轮）

| 能力 | 说明 |
|---|---|
| 右键菜单 | 节点上右键 → 从这里连线… / 删除出边（列出所有出边）/ 关闭 |
| 连线 | 进入连线模式后点目标节点，按来源 flow **写回文档**：播放→`nextSceneId`、选择→追加选项、QTE→成功分支、菜单→追加菜单项、结算→下一章；结局节点与自连被拒绝并提示 |
| 删边 | 删除按语义定位：播放→移除 `nextSceneId`、选择→移除该选项的 `nextSceneId`、菜单→移除菜单项、QTE→移除成功/失败分支 |
| 取消 | `Esc` 退出连线模式；连线中顶部显示金色提示条 |
| 撤销 | 走 `EditorProvider.apply`，因此可用顶栏撤销/重做，并计入修订 |

新增 `edge-ops.ts`（纯函数，返回 JsonPatchOp[]）+ 6 项单测；图视图拆为 `GraphParts` / `NodeCard` / `use-graph-gestures`，`StoryGraphView` 回到 80 行内。

验证：`tsc 0 / lint 0 / inline 0 / **109 tests**`；浏览器右键菜单实测出现「从这里连线… / 没有出边 / 关闭」，19 节点 8 连线正常渲染。

自评（本轮后）：视觉 68%、功能 **82%**、交互 **72%**、工程 85%、后端 45% → **加权 ≈ 72%**。
---

## 12. 导出构建流水线（本轮）

从"只能报价"变成"能出片"：

| 层 | 文件 | 说明 |
|---|---|---|
| ZIP | `server/export/zip.ts` | 零依赖 store 模式 ZIP（CRC32 + 本地头/中央目录/EOCD），不引入 archiver/jszip |
| 播放器 | `server/export/player-html.ts` | 生成独立 `index.html`：内嵌项目 JSON + ~180 行原生 JS 播放器（锚点布局、文字/图片/视频、选择/菜单/QTE/结局/结算、auto 计时跳转、窗口自适应缩放） |
| 打包 | `server/export/build.ts` | 组包：`index.html` + `project.json` + `README.txt` + `assets/`（从 `public/uploads` 复制，缺失则记 warning）+ `manifest.json`（节点数/积分/素材统计） |
| API | `POST /api/projects/[id]/export` | `{target}` → `application/zip`，带 `x-export-scenes / x-export-credits / x-export-warnings` 头与 UTF-8 文件名 |
| UI | 设置页「导出作品」 | 每个目标一个「构建××」按钮，直接下载 zip，显示积分与素材缺失数 |

验证：

```text
单测 4 项（crc32 已知值 0xCBF43926、zip magic PK + EOCD、包内条目齐全、html 内嵌数据/脚本）→ 总 113 tests
E2E：POST export（19 节点）→ 200 application/zip，88,673 字节，content-disposition 正确，
      header scenes=19 credits=3800 warnings=1
解包：index.html 31.9KB / project.json 55.6KB / manifest.json / README.txt
播放：file:// 打开 index.html → title 正确、DOC.scenes=19、渲染 8 个节点 + 「重新开始」按钮、无控制台错误
```

已知限制：素材缺失时导出包不含该文件（示例工程的视频只在目标产品上，本地没有，故 1 条 warning）；播放器是精简版（无换皮面板、无变量持久化、无音轨控制），完整交互仍以编辑器内「试玩」为准。

自评：功能 **88%**、视觉 68%、交互 72%、工程 85%、后端 55% → **加权 ≈ 76%**。
---

## 13. 交互补强（本轮）

| 新增交互 | 说明 |
|---|---|
| 四角缩放 | `resizeCornerOps`：拖左上角同时移动+改尺寸、右下角只改尺寸；把手大小按 `8/scale` 反向补偿，屏幕上恒定 |
| 拖动阈值 | 位移 < 2px 视为点选，不再"手一抖就改数据" |
| 悬停高亮 | 画布元件 hover 时描边变金色，可点范围更明确 |
| 双击改字 | 文本元件双击进入内联编辑（Enter 提交 / Esc 取消），绑定表达式 `${node.x}` 也能直接编辑 |
| 方向键微调 | ↑↓←→ 移动 1px，Shift+方向 10px |
| Delete 删除 | 选中元件按 Delete/Backspace 删除（可撤销） |
| 全局快捷键 | `Ctrl/⌘+Z` 撤销、`Shift+Ctrl+Z` / `Ctrl+Y` 重做、`Ctrl/⌘+S` 保存 |

验证：`tsc 0 / lint 0 / inline 0 / **115 tests**`（新增四角缩放 2 项）。
浏览器实测：点选后出现 4 个把手、右侧面板显示绑定表达式 `${node.标题}`、方向键后状态变「未保存 · 2 处待保存」、双击出现 `.film-inline-text`、无控制台错误。

### 仍然缺的交互（诚实清单）

- 多选 / 框选、对齐吸附与参考线、图层树拖拽排序、复制粘贴、z-order 快捷调整；
- 场景画布没有 Ctrl+滚轮缩放与空格拖拽平移（只有底部缩放条）；
- 故事图的节点拖动位置不入库、无键盘操作、无边选中高亮；
- 属性面板改值需要失焦才提交，没有实时预览。

自评：交互 **80%**（上轮 72%），视觉 68%、功能 88%、工程 85%、后端 55% → **加权 ≈ 78%**。