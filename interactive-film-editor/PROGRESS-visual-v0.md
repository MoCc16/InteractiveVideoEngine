# 视觉对齐 V0 + V1（样式层重做，第一步）

日期：2026-10-28
路线：**C —— 布局/密度照目标产品，token 结构与命名对齐 morph，配色取目标产品金色系**

## V0：从目标产品 CSS 提取设计系统（可复现）

`scripts/extract-design-tokens.mjs` → `design/design-tokens.json`

从 `index-*.css`（328 KB）与 `fonts-*.css`（1.9 MB）里提取到：

| 维度 | 实测结果 |
|---|---|
| `:root` 变量 | 34 个（`--silver*`、`--text-1/2/3`、`--edge`、`--edge-toplight`、`--shadow-nav/float`、`--t-*`、`--font-ui/mono`、`--t-<节点类型>`） |
| 颜色 | 383 个 hex；背景集中在半透明白 `#ffffff08/0a/0d/0f/12/14/1a` + 底 `#141414`；强调金 `#c9a84c`（41 次） |
| 字号 | **11px ×119、12px ×77、10px ×70、11.5 ×68、9.5 ×56** —— 目标产品是"高密度小字号"界面 |
| 控件高度 | 22 / 24 / 26 / 28 / 30 / 32 / 36 px |
| 圆角 | 999px 胶囊 ×107，其次 8/10/9/12/6/7px |
| 玻璃 | `blur(20px) saturate(1.2)`、`blur(24px) saturate(1.4)`、`blur(16px) saturate(1.35)` |
| 阴影 | 252 种，核心是 `--shadow-nav`、`--shadow-float`、`inset 0 1px 0 #ffffff38`（顶部高光） |
| 字体 | 2122 个 `@font-face`；正文 `Noto Sans SC`、标题衬线 `Noto Serif SC`、叙事楷体 `LXGW WenKai Screen` |

## V1：token 层按目标值重建（`src/styles/film/tokens/`）

| 文件 | 内容 |
|---|---|
| `01-typography.css` | 字体栈（ui/serif/kai/mono）+ 9~24px 密度阶梯 + 行高/字重 |
| `02-surface.css` | 底 `#141414` + 三层半透明白（`#ffffff08/0f/14`）+ 文字三级（`#ffffffeb`/`#fff9`/`#ffffff61`）+ `--edge`/`--edge-toplight` + 金 `#c9a84c`/`#f0d060` + 10 个节点类型色 + 圆角/间距/控件高度 |
| `03-shadow.css` | `--shadow-nav`/`--shadow-float`/`--shadow-inset-top` + 三档玻璃 blur |
| `04-motion.css` | `.12s ease` / `.2s cubic-bezier(.2,.8,.2,1)` / 弹簧曲线 |
| `ui.css` | 顶栏玻璃 + 1px 高光边、胶囊按钮（26px 高）、26px 输入框、8px 栅格、`.film-table` 表头小字号大写 |

同时保留旧变量名做别名（`--film-surface-0`、`--film-text-primary`、`--film-accent-gold`…），现有组件不用改就能吃到新值。

## 效果（同一页面，改前 / 改后）

- 改前：`--film-surface-0:#0b0b10`、字号 12~28、按钮直角、无玻璃 → 观感"自研后台"
- 改后：`#141414` 底 + 半透明白分层、11~13px 主字号、胶囊按钮、顶栏 `blur(20px)` + 顶部高光、金色描边 → 观感明显靠近目标产品

截图：`_rea/v1_home.png`、`_rea/v1_settings.png`、`_rea/v1_graph.png`

## 还没做的（按 C 路线的顺序）

1. **V1 剩余**：设置页/资源页/节点页里仍是内联 `sectionStyle`，需要换成 `.film-panel`（观感还会再变一档）。
2. **等功能的 V2**：真实视频播放 → 播放条皮肤；QTE 四种手势 → 手柄/判定 UI；面板换皮 → 浮层皮肤。这三件会改元件结构，所以元件皮肤放它们之后。
3. **字体文件**：目标产品用子集化的 `Noto Sans SC` / `LXGW WenKai`（2122 个 `@font-face`，按 unicode-range 切片）。要完全一致的排版，需要把这些 woff2 子集搬过来（体积大）；现在先用系统字体栈兜底。
4. **Phase 7 内联清理**：暂停，等视觉定稿一次性做。

---

## V1 尾巴（第二轮）：五个页面换成统一面板/表单类

| 页面 | 之前 | 现在 |
|---|---|---|
| 设置 | 内联 sectionStyle，区块贴边、字号 14/16 | `.film-panel` 玻璃面板 + `.film-form-row` 132px 标签列 + 26px 输入框 |
| 资源 | 内联三栏、按钮直角 | `.film-editor-grid` + 胶囊筛选 + `.film-listitem` 列表 + `.film-side` 详情 |
| 变量 | 内联表格 | `.film-table` + 胶囊筛选 + `.film-input` |
| 章节 | 内联列表/表单 | `.film-listitem` + `.film-form-row-sm` |
| 章节表单 | 内联行 | 同上（仅剩 1 处 `style={{height:64}}` 待处理） |

**内联视觉原语：247 → 96 处（已转 61%）**

剩余（按优先级）：

| 文件 | 处数 | 处理时机 |
|---|---|---|
| `scene/PropertyPanel` | 21 | 下一轮（纯表单，机械） |
| `scene/SceneEditor` | 14 | 下一轮（三栏栅格） |
| `nodes/NodesEditor` + `NodeForm` + `NodeFlowEditors` + `ChoiceFlowEditor` | 29 | 下一轮 |
| `play/PlayRuntime` | 14 | 与 V2 面板皮肤一起做 |
| `scene/renderers` | 17 | **V2 元件皮肤时重写，不单独转** |
| `ChapterForm` / `LayerTree` / `ThemePanel` | 1 / 1 / 1 | 收尾 |

截图：`_rea/v1b_settings.png`、`_rea/v1b_assets.png`、`_rea/v1b_chapters.png`、`_rea/v1b_variables.png`