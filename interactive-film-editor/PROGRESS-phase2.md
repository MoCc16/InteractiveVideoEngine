# Phase 2 · 场景画布 / 节点表单 / 乐观锁

日期：2026-10-28
状态：✅ 完成（`verify:static` 通过：lint 0 error（5 warning）/ tsc 0 error / 53 tests）

## 交付

| 模块 | 文件 | 说明 |
|---|---|---|
| 锚点算法 | `src/domain/project/anchor.ts` | 四边锚点 + %/px + offset → 盒子；拉伸/单边/居中/负锚点；auto 尺寸按注册表兜底 |
| 元件注册表 | `src/features/scene/registry.ts` | 30 种类型 → 展示名/分组/auto 尺寸/可编辑性；`missingTypes()` 保证与 schema 同步 |
| 画布渲染 | `src/features/scene/SceneCanvas.tsx` | 递归渲染元件树；读取 `style`（fontSize/color/textAlign/background）与 `content`（literal/binding） |
| 图层树 | `src/features/scene/LayerTree.tsx` | 缩进 + 选中高亮 |
| 属性面板 | `src/features/scene/PropertyPanel.tsx` | 内容/绑定可编辑（写 patch）；位置、尺寸、锚点、z、旋转只读展示 |
| 场景页 | `src/features/scene/SceneEditor.tsx` + `app/v2/project/[id]/scene/[sceneId]/page.tsx` | 版式模板切换（写 `layoutId` patch）、42% 缩放画布、三栏布局 |
| 节点表单 | `src/features/nodes/{NodesEditor,NodeForm,NodeFlowEditors,ChoiceFlowEditor}.tsx` | 列表 + 类型过滤；标题/章节/起始/结局；6 类 flow 分支编辑 |
| 乐观锁 | `store.ts` / `service.ts` | `expectedRevision` → 冲突抛 `ProjectConflictError` → API 返回 **409** + `{expectedRevision, actualRevision}` |

### 节点表单已支持的写操作

- 通用：`displayTitle`、`chapterId`、`isStart`、`isEnding`
- `auto`：`flow.nextSceneId`
- `choice`：每个选项的 `text` / `appearAt` / `nextSceneId`，**添加选项**（`/flow/choices/-`）、**删除选项**；`choiceTimeout.sec`（留空即移除）
- `qte`：`kind`（tap/mash/direction/timing）、`startSec`、`endSec`（按时长换算）、成功/失败去向
- `menu`：每项的 `label`、`action.type`、`action.sceneId`
- `ending`：`fields.结局标题 / 结局描述 / 线索`
- `settlement`：`flow.nextChapterNodeId`

全部通过 JSON Patch 深路径写入（例：`/scenes/3/flow/choices/0/text`）。

## 验证（真实输出）

```text
npm run verify:static → 9 files / 53 tests pass；lint 0 error；tsc 0 error

GET  /api/projects/:id                       200  scenes 19 / layouts 9
PATCH /scenes/0/displayTitle                 200  revision 1
PATCH 同一个项目 baseRevision=0（过期）        409  revision_conflict
     {"expectedRevision":0,"actualRevision":1}
GET  /v2/project/:id/scene/:sceneId          200  图层 7 / 版式下拉 / 画布 1920×1080@42%
GET  /v2/project/:id/nodes                   200  19 个节点 + 类型筛选 + 表单
```

截图：`_rea/phase2_scene.png`、`_rea/phase2_nodes.png`

## 这轮修掉的真问题

1. **`chapterId` 不在 schema 里**：表单绑定章节时报 `Type '{}' is not assignable`，追查发现是 passthrough 字段（unknown）。已补进 `sceneSchema`。
2. **`content` 用 union 导致 `expr` 类型丢失**：binding 与 literal 的联合把 `expr` 挤成 unknown。改成单对象 `{kind, value?, expr?}` 并保留 passthrough。
3. **画布缩放会撑出滚动条**：`transform: scale()` 不影响布局尺寸，必须外套 `width = 画布宽 × scale` 的容器。
4. **锚点测试假设错误**：上负下正且对称时高度不变、整体上移（不是变高）——逆向确认后修正断言。

## 已知债务（不阻塞）

- ESLint 5 个 warning：`SceneEditor`(114 行/复杂度16)、`ChoiceFlowEditor`(105 行)、`PropertyPanel`(复杂度19)、`boxStyle`(复杂度20)。morph 里同类警告也是允许的，但 Phase 3 拆组件时一并处理。
- 画布只渲染「结构 + 文本 + 样式」，成品元件（播放条/选项列表/主菜单）还没有专属渲染器，现在是通用盒子 + 占位文案。
- 拖拽移动/缩放元件、属性面板的样式编辑、图层排序尚未实现。

## Phase 3 计划

1. 专属渲染器：`videoPlayer` / `choiceList` / `mainMenu` / `chapterListView`（按真实 props 渲染）。
2. 画布交互：拖拽移动、四角缩放（写回 anchors）、多选、对齐参考线。
3. 章节页 + 变量页（含前置条件编辑器）。
4. 试玩运行时（6 型状态机）+ 设置页。
