# ADR 0001 · 技术栈与数据模型（实现 morph 前置决策）

- 状态：已定（用户 2026-10-28 确认）
- 影响：全部后续实现

## 决策

1. **技术栈直接对齐 morph**：Next.js App Router + TypeScript `strict` + token 化的自有 CSS 体系 + zod 领域模型 + vitest。
   不采用"先写原生 JS 再重写"的路线。
2. **迁移路线 A → 逐步 B**：先作为可整体搬运的子包（morph 的 `packages/opencut-classic-editor` 范式），再按 `src/features/<domain>` 逐步 token 化。
3. **业务模型不重写**：数据库只存「信封 + patch 日志」，领域模型始终是 `src/domain/project/schema.ts`（Project v1.0）。

## 为什么业务模型不落成关系表

目标产品（Choiscene v0.7.1）本身就是这个结构（逆向实证）：

- 项目是一份 `Project` JSON 文档，所有编辑以 **JSON Patch（RFC 6902）** 提交（如 `/scenes/${id}/flow/choices/${cid}/text`）。
- 变更历史是 patch 序列（`GET /projects/:id/changelog` + 「回滚到此」）。

若把 scene/chapter/variable/layout 拆成关系表：

- 每个 patch 深路径都要翻译成多表事务，patch 语义丢失 → 撤销/重做/回滚要重写；
- 领域规则（flow 6 型、条件树、锚点）散进 ORM，schema 双份维护；
- 迁移 morph 时必须再做一次数据迁移与回归。

因此：**Prisma 只承载信封**（`film_project` / `film_project_revision`），文档仍是 JSON。

## 代价与约束（明确接受）

- 单文档写入是整doc 覆盖（当前 FileProjectStore）；规模大时需要分片/压缩，见 Phase 4。
- 数据库层无法用 SQL 直接查场景字段；搜索/统计走读取 doc 后在应用层建索引（后续可加投影表，但**不作为事实来源**）。
- 并发用 revision 乐观锁（`ProjectConflictError` 已预留）。

## 备选方案（未采纳）

- 全关系化（scene/chapter/choice 表）：迁移与回滚复杂度高，且与目标产品的 patch 模型相悖。
- 纯前端存储（IndexedDB）：无法满足多人/后台/导出。
