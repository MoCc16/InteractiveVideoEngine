# Phase 0 · 骨架与领域模型

日期：2026-10-28
状态：✅ 完成（`verify:static` 通过）

## 交付

| 项 | 文件 |
|---|---|
| Project v1.0 领域模型（zod，6 种 flow、27+ 元件、章节前置条件、变量、素材、版式） | `src/domain/project/schema.ts` |
| JSON Patch（RFC 6902）+ 反向 patch（撤销栈基础） | `src/domain/project/patch.ts` |
| 文档存储接口 + 文件实现（doc + revisions.jsonl + 乐观锁错误类型） | `src/server/projects/store.ts` |
| Prisma 信封模型（仅两张表，不拆业务表） | `prisma/schema.prisma` |
| 设计 token（typography/surface/motion，唯一允许出现色值的层） | `src/styles/film/tokens*.css` |
| 图标唯一入口（禁 inline svg / 禁直连图标库） | `src/components/ui/icons/index.tsx` |
| Next App Router 外壳 + 冒烟页 | `src/app/layout.tsx`、`src/app/page.tsx` |
| i18n 目录骨架 | `messages/{zh,en}/common.json` |
| 测试（schema 真实文档兼容 / patch / store） | `tests/unit/project/*.test.ts`、`tests/fixtures/*.json` |

## 验证（真实输出）

```text
vitest: 3 files / 21 tests passed
tsc --noEmit: 0 error（strict + noUncheckedIndexedAccess）
eslint（flat config，含 no-inline-svg / 禁 lucide 直连 / 函数≤80 行）: 0 error
```

## 用真实文档做回归时抓到的两处模型偏差（已修）

1. `content.kind` 除了 `literal` 还有 **`binding`**（`{kind:"binding", expr:"${node.结局标题}"}`），初版枚举漏了。
2. 元件类型名与推测不同：实际是 `atmosphericOverlay` / `navMenu` / `progressBar` / `mobileProgressBar` / `splashScreen` / `endingButton`，不是 `atmosphere` / `topMenuBar` / `progress`。

→ 结论：**必须用真实项目文档当 fixture 跑 schema**，否则模型会"看起来对、实际错"。

## 下一阶段（Phase 1）

1. 项目列表页 + 项目外壳（顶栏 / 8 页签 / 保存三态 / 撤销重做）接 store 与 patch API。
2. `apiHandler` + `requireUserAuth` 的薄 route（`/api/projects`、`/api/projects/[id]`、`/api/projects/[id]/changelog`）。
3. 故事图（节点卡 + 连线 + 右键预设 + 检查器）第一版：先只读渲染 + 选择，不做拖拽。
4. 场景画布：元件注册表（从 27 型起）+ 锚点渲染器 + 图层树，先渲染 `lay_cat_*` 模板。
