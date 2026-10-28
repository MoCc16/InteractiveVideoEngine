# Phase 1 · API + 编辑器外壳 + 故事图

日期：2026-10-28
状态：✅ 完成（`verify:static` 通过：lint 0 error / tsc 0 error / 40 tests）

## 交付

| 层 | 文件 | 说明 |
|---|---|---|
| HTTP 出口 | `src/server/http/api-handler.ts`、`api-error.ts` | 统一错误归一 + `x-request-id`；无 `console.*` |
| 鉴权桩 | `src/server/auth/session.ts` | `requireUserAuth`（`x-user-id`，迁移时换 morph 的 `requireProjectAuth`） |
| 业务层 | `src/server/projects/service.ts` | zod 校验请求体 → 试算 patch → 落盘；错误语义 400/404/422 |
| 容器 | `src/server/projects/container.ts` | 单例注入 `FileProjectStore` |
| 路由 | `app/api/projects/route.ts`、`app/api/projects/[id]/route.ts`、`app/api/projects/[id]/changelog/route.ts` | GET 列表 / GET 文档 / PATCH patch / GET changelog |
| 编辑会话 | `src/features/editor/patch-session.ts` | 纯函数：dispatch / undo / redo / saving / saved；**批次保存反向 patch** |
| 客户端状态 | `src/features/editor/EditorProvider.tsx` | 本地应用 patch → 乐观更新 → PATCH 保存 → 用服务端文档复位 |
| 外壳 | `EditorShell / EditorHeader / EditorTabs` | 项目名内联编辑、保存三态、撤销/重做、8 页签（未实现页签置灰） |
| 故事图 | `src/features/story-graph/{layout.ts,StoryGraphView.tsx}` + `components/ui/graph/EdgeLayer.tsx` | flow → 边；BFS 分层坐标；孤岛标记；SVG 只在视觉原语模块 |
| 页面 | `app/projects/page.tsx`、`app/v2/project/[id]/{layout,page}.tsx`、`.../graph/page.tsx` | 列表 → 编辑器 → 故事图 |

## 验证（真实输出）

```text
npm run verify:static   → lint 0 error / tsc 0 error / 40 tests pass

GET  /api/projects                       200  count=3
GET  /api/projects/:id                   200  scenes=9
GET  /api/projects/:id/changelog         200  revisions=1（改名后）
PATCH /api/projects/:id  (replace name)  200  revision=2（还原）
PATCH /api/projects/:id  (非法路径)      400  bad_request
GET  /projects                           200  含「打开故事图」
GET  /v2/project/:id/graph               200  9 节点 · 2 连线 · 8 孤岛
```

截图：`_rea/phase1_graph.png`

## 设计取舍

- **撤销栈存反向 patch**：`dispatch` 时按"当前文档"算 inverse；若在 undo 时才算，replace 会拿到新值当旧值（这一条被单测抓到并修正）。
- **试算后再落盘**：`ProjectService.patch` 先在内存 apply + `parseProjectDoc`，非法结果直接 422，不写半成品。
- **坐标不持久化**：故事图位置是确定性 BFS 分层（目标产品同样不存坐标）；后续要手动拖拽时再引入 `positions` 旁路存储（不进 doc，避免污染业务模型）。
- **页签先置灰**：只放已实现入口，避免点进去 404。

## 已知待办（Phase 2 起点）

1. 场景画布：元件注册表（30 型）+ 锚点渲染器 + 图层树，先渲染真实 `lay_cat_*` 模板。
2. 节点表单：6 类 flow 的表单化编辑（选项/QTE/菜单/结算/结局）。
3. 章节 / 变量页（含前置条件编辑器）。
4. 保存的并发冲突处理：目前 `baseRevision` 只透传，未做 409 冲突分支与重放。
5. 导出链路与试玩运行时。
