# Phase 3 · 专属渲染器 / 画布拖拽 / 章节 / 变量

日期：2026-10-28
状态：✅ 完成（`verify:static`：lint 0 error（8 warning）/ tsc 0 error / 59 tests）

## 交付

| 模块 | 文件 | 说明 |
|---|---|---|
| 成品元件渲染器 | `src/features/scene/renderers.tsx` | 播放条（进度/时间/倍速/设置/选集）、选项列表、主菜单、章节列表、进度卡、启动屏、结局/动作按钮、QTE 手柄、氛围滤镜；其余按通用盒子渲染 |
| 画布交互 | `src/features/scene/SceneCanvas.tsx` + `drag.ts` | 点选、**拖动移动**、**右下角缩放**（pointer 事件 + 实时幽灵位移，松手才写 patch） |
| 交互数学 | `src/features/scene/drag.ts` | 位移 → 锚点 patch：优先改同侧锚点；只有 bottom/right 时反向补偿；% 锚点写 offset；无锚点一次性写入落点；尺寸 px + 8px 下限 |
| 路径解析 | `src/features/scene/paths.ts` | 按 JSON Pointer 取「当前」元件，属性面板不再显示点选时的旧快照 |
| 章节页 | `src/features/chapters/{ChaptersEditor,ChapterForm}.tsx` | 列表 / 新建 / 删除；名称、序号、简介、首节点、起始章、启用；**解锁条件**（AND/OR × 章节完成多选 / 变量布尔） |
| 变量页 | `src/features/variables/VariablesEditor.tsx` | 列表 / 类型与作用域筛选 / 新建（id+类型+作用域+默认值按类型给）/ 改默认值 / 删除 |
| 页签 | `EditorTabs` | 章节、变量已启用；仅剩资源/试玩/设置置灰 |

## 验证（真实输出）

```text
npm run verify:static → 10 files / 59 tests pass；lint 0 error；tsc 0 error

# 画布拖动（真实浏览器 + CDP 指针事件驱动，非 mock）
before: 已保存
after : 未保存；属性面板 x/y 从 870/952 → 1013/1009（dx=60px 屏幕 ≈ 143px 画布）

GET /v2/project/:id/chapters   200  1 章 / 章节表单 / 解锁条件 / 删除本章
GET /v2/project/:id/variables  200  变量列表 + 新建（文本/数值/布尔 × 三种作用域）
```

截图：`_rea/phase3_scene.png`、`_rea/phase3_chapters.png`、`_rea/phase3_variables.png`

## 这轮修掉的真问题

1. **JSON Patch 不能创建中间节点**：给没有 `anchors` 的元件写 `/anchors/left` 直接报错 → 必须先整体 `add /anchors`；`size` 同理。
2. **只有 bottom 锚点的元件往下拖会变成负高度**（top+bottom 拉伸冲突）→ 改为反向补偿 bottom。
3. **属性面板显示旧快照**：点选时把 component 存进 state，编辑后不更新 → 改为按 path 从 doc 实时解析。
4. **拖拽增量漏了半边**：`anchors` 存在但缺 top 时，落点用的是旧 box.y → 已加 delta。

## 已知债务（不阻塞）

- 8 个 ESLint warning（`SceneEditor` 116 行、`SceneCanvas` 113 行、`VariablesEditor` 140 行、`PropertyPanel`/`boxStyle` 复杂度）——Phase 4 拆组件时统一处理。
- 画布还没有对齐参考线、多选、图层排序/隐藏、撤销拖拽的粒子级历史（现在一次拖拽=一条 patch 批次）。
- 成品元件仍是"结构级"渲染：没有接视频/素材/主题 token，也没有真实动画。

## Phase 4 计划

1. 试玩运行时：6 型节点状态机 + 变量作用域 + 章节解锁 + 面板（设置/进度/选集）。
2. 资源页：上传（真机验证过的 multipart 契约）、引用检查、配额。
3. 设置页：开场主界面 / 配色方案 / 画布与字体 / 导出（先用报价接口，不构建）。
4. 拆 ESLint warning + 补 `packages/` 迁移形态（对齐 morph 的 A 方案）。
