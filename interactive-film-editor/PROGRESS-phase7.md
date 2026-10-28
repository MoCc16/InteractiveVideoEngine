# Phase 7 · 迁移前收口（进行中）

日期：2026-10-28
状态：🟡 部分完成 —— 工具链与文档已就绪，内联样式转换完成 **76 / 247 处**（31%）

## 已完成

| 项 | 内容 |
|---|---|
| 自查守卫 | `scripts/check-inline-primitives.mjs`：扫描 TSX 内联 `fontSize/width/height/gap/margin/padding…`，默认只报告、`--strict` 才失败；已接入 `verify:static` |
| UI 类体系 | `src/styles/film/ui.css`：`.film-header/.film-tabs/.film-btn/.film-panel/.film-table/.film-editor-grid…` + primitive token |
| 已转换 | 根布局、首页、项目页、顶栏、页签、图层树、配色面板（7 个文件，76 处） |
| 迁移入口 | `src/embedded.tsx`：`<FilmEditorApp projectId doc />`，morph 侧一行接入 |
| 迁移文档 | `docs/migration-to-morph.md`：落位方案、需替换的四处、Prisma 信封模型、守卫豁免建议、剩余工作 |
| 画布豁免 | `SceneCanvas` / `PlayStage` / `StoryGraphView` 属数据驱动几何，已在守卫里显式豁免并写明理由（与 morph 豁免 `/video-editor/` 同源） |

## 验证

```text
npm run verify:static  → lint 0 error（14 warning）/ tsc 0 error / 86 tests / inline 报告
内联视觉原语：21 文件 247 处 → 15 文件 171 处
浏览器实测：.film-header 背景 rgb(20,20,31)、body rgb(11,11,16)（CSS 类生效）
```

## 未完成（下一轮）

剩余 171 处，按文件：

| 文件 | 处数 | 备注 |
|---|---|---|
| `settings/SettingsEditor` | 23 | 表单行样式可复用 `.film-input/.film-label` |
| `scene/PropertyPanel` | 21 | 三个页签内的小控件 |
| `scene/renderers` | 17 | 成品元件预览（结构级） |
| `assets/AssetsEditor` | 16 | 列表/详情 |
| `play/PlayRuntime` | 14 | 工具条 + 面板 |
| `scene/SceneEditor` | 14 | 三栏栅格 |
| `variables/VariablesEditor` | 13 | |
| `chapters/ChapterForm` | 12 | |
| `nodes/NodesEditor` | 11 | |
| `chapters/ChaptersEditor` | 9 | |
| `nodes/ChoiceFlowEditor` | 9 | |
| `nodes/NodeForm` | 5 | |
| `nodes/NodeFlowEditors` | 4 | |
| `scene/LayerTree`、`scene/ThemePanel` | 1 + 1 | CSS 变量已用上，仅剩 1 处误报/边角 |

另外 14 个 ESLint warning 未拆（`SceneEditor` 120 行、`SceneCanvas` ~120 行、`VariablesEditor` 140 行、`PlayRuntime` ~200 行、`readImageSize` 复杂度 16）。

## 下一轮的做法（机械且可验证）

1. 每个文件按「容器 → `.film-panel/.film-card`；文本 → `.film-label/.film-h2`；控件 → `.film-btn/.film-input`」替换；
2. 每次改完跑 `npm run check:inline`，数字下降即通过；
3. 到 0 后把 `check:inline:strict` 接进 `verify:static`，并把画布三文件之外的豁免全部移除；
4. 再拆 5 个超长/高复杂度函数，warning 清零。
