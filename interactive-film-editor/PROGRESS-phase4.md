# Phase 4 · 样式内核（渲染 / 编辑 / 主题）

日期：2026-10-28
状态：✅ 完成（`verify:static`：lint 0 error（7 warning）/ tsc 0 error / 68 tests）

## 为什么先做样式

试玩运行时与导出包都吃同一套渲染，样式没定稿就做运行时 = 视觉债要改两遍。所以把样式拆成两段：
**玩家可见的样式（本阶段）** 与 **工程合规的样式（Phase 7：inline style → CSS + token 守卫）**。

## 交付

| 模块 | 文件 | 说明 |
|---|---|---|
| 样式模型 | `src/domain/project/style.ts` | 20+ 样式键；三级回退「元件显式 → 项目主题 → 类型默认」；`{kind:"literal"}` / `{kind:"binding",expr}` 两种取值；`${theme.x}/${node.x}/${var.x}` 解析；数值兜底、透明度裁剪 |
| 主题 | 同上 | `theme.tokens`（主色/强调色/背景色/文字色）+ 三套预设（鎏金 / 冷光蓝白 / 科技青）+ `DEFAULT_THEME` 回退 |
| 渲染 | `SceneCanvas.tsx` | 按解析后的样式渲染：字号/字重/行高/字间距/对齐/颜色/背景/描边/圆角/阴影/不透明度/内边距/换行；**子元件按 z 再按树序排序** |
| 属性面板 | `PropertyPanel.tsx` | 「内容 / 外观」双页签；外观分三组：排版（字号/字重/行高/字间距/对齐）、颜色（文字/背景/描边）、边框与效果（描边宽/圆角/不透明度/阴影），全部写 `style.<key>` 的 literal patch |
| 配色面板 | `ThemePanel.tsx` | 场景页左栏底部：三套预设一键应用 + 四色微调，写 `theme.tokens.*` |

## 验证（真实输出）

```text
npm run verify:static → 11 files / 68 tests pass；lint 0 error；tsc 0 error

# 主题真的生效（CDP 读 canvas 根节点 inline style）
canvas background: rgb(20,20,31)  --点击「科技青」-->  rgb(7,22,23)
状态：已保存 → 未保存（说明 patch 进了撤销栈）

# 外观面板读到真实数据
选中 lay_cat_mainMenu_title：字号 56 / 字重 400 / 行高 1.3 / 文字色 #eaf2ff（都来自项目自身 style）
```

截图：`_rea/phase4_appearance.png`（外观页签）、`_rea/phase4_scene_theme.png`（配色面板）

## 这轮修掉的真问题

1. **颜色输入框兜底会骗人**：没设过背景色的元件显示 `#000000`，看起来像"设了黑色" → 文本值改为空、色块用黑色占位。
2. **z 顺序之前没生效**：只写了 `zIndex` 但 DOM 顺序没排，重叠时后插入的压住高 z → 渲染前按 `z` 再按树序排序。
3. **样式值可能是裸值**（老数据/手写 JSON）：`readStyleValue` 三种形态（literal / binding / 裸值）都要吃。

## 已知债务（不阻塞）

- 7 个 ESLint warning：`SceneEditor`(120 行/复杂度 18)、`SceneCanvas`(约 120 行)、`VariablesEditor`(140 行)、`boxStyle` 已随重构消失。Phase 7 拆组件时统一收。
- 内联 style 仍是主流写法 → Phase 7 必须转 CSS 类，否则 morph 的 `tsx-inline-visual-primitive-guard` 会拦（该守卫禁 fontSize/width/gap/margin/padding 等内联，allowlist 为空，仅 `/video-editor/` 等目录豁免）。
- 背景图/渐变、混合模式、文本多行省略策略、字体族选择还没做。

## Phase 5 计划

试玩运行时：6 型节点状态机（auto/choice/qte/ending/menu/settlement）+ 变量作用域（run/session/project）+ 章节解锁 + 设置/进度/选集面板 + Inspect 面板，用同一套 `resolveStyle` 渲染。
