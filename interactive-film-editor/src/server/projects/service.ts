/**
 * 项目服务：把 store 的异常翻译成 API 语义错误。
 * 这是 route 与 store 之间唯一的业务层，迁移 Prisma 时只需换 store 实现。
 */
import { z } from "zod";
import { badRequest, conflict, notFound, unprocessable } from "@/server/http/api-error";
import { ProjectConflictError, ProjectNotFoundError, type ProjectStore } from "@/server/projects/store";
import { parseProjectDoc, projectDocSchema } from "@/domain/project/schema";
import { createBlankProject, newProjectId } from "@/domain/project/blank";
import { JsonPatchError, applyJsonPatch, type JsonPatchOp } from "@/domain/project/patch";

export const patchRequestSchema = z.object({
  baseRevision: z.number().int().nonnegative().optional(),
  ops: z
    .array(
      z.union([
        z.object({ op: z.literal("add"), path: z.string(), value: z.unknown() }),
        z.object({ op: z.literal("remove"), path: z.string() }),
        z.object({ op: z.literal("replace"), path: z.string(), value: z.unknown() }),
        z.object({ op: z.literal("move"), from: z.string(), path: z.string() }),
        z.object({ op: z.literal("copy"), from: z.string(), path: z.string() }),
        z.object({ op: z.literal("test"), path: z.string(), value: z.unknown() }),
      ]),
    )
    .min(1),
});

export type PatchRequest = z.infer<typeof patchRequestSchema>;

export class ProjectService {
  constructor(private readonly store: ProjectStore) {}

  async list(userId: string) {
    return this.store.list(userId);
  }

  async get(id: string) {
    const doc = await this.store.get(id);
    if (!doc) throw notFound(`项目 ${id} 不存在`);
    return doc;
  }

  /**
   * 新建 / 复制 / 导入：
   * - `{ name }` → 空白工程
   * - `{ fromId, name? }` → 复制已有工程
   * - 其他 → 视为完整 ProjectDoc（导入用）
   */
  async create(raw: unknown, userId: string) {
    const body = (raw ?? {}) as Record<string, unknown>;

    if (typeof body["fromId"] === "string") {
      const source = await this.store.get(body["fromId"]);
      if (!source) throw notFound(`项目 ${body["fromId"]} 不存在`);
      const name = typeof body["name"] === "string" && body["name"] ? body["name"] : `${source.name} 副本`;
      return this.store.create({ ...source, id: newProjectId(), name }, userId);
    }

    if (typeof body["name"] === "string" && !("schemaVersion" in body)) {
      return this.store.create(createBlankProject(body["name"] || "未命名项目"), userId);
    }

    const parsed = projectDocSchema.safeParse(raw);
    if (!parsed.success) throw unprocessable("项目文档不合法", parsed.error.issues.slice(0, 5));
    return this.store.create(parsed.data, userId);
  }

  async rename(id: string, name: string, userId: string) {
    if (!name.trim()) throw badRequest("项目名不能为空");
    const result = await this.patch(id, { baseRevision: undefined, ops: [{ op: "replace", path: "/name", value: name }] }, userId);
    return result;
  }

  async remove(id: string, userId: string) {
    const owner = await this.store.ownerOf(id);
    if (owner === null) throw notFound(`项目 ${id} 不存在`);
    if (owner !== userId) throw notFound(`项目 ${id} 不存在`);
    await this.store.remove(id);
    return { id };
  }

  async patch(id: string, body: unknown, actorId: string) {
    const parsed = patchRequestSchema.safeParse(body);
    if (!parsed.success) throw badRequest("patch 请求不合法", parsed.error.issues.slice(0, 5));

    const current = await this.store.get(id);
    if (!current) throw notFound(`项目 ${id} 不存在`);

    try {
      // 先本地试算，避免把非法文档写盘
      parseProjectDoc(applyJsonPatch(current, parsed.data.ops as JsonPatchOp[]));
    } catch (error) {
      if (error instanceof JsonPatchError) throw badRequest(error.message, { path: error.path, index: error.opIndex });
      throw unprocessable("patch 结果不是合法项目文档");
    }

    try {
      const result = await this.store.applyPatch(id, parsed.data.ops as JsonPatchOp[], {
        actorId,
        message: `保存修改（${parsed.data.ops.length} 处）`,
        expectedRevision: parsed.data.baseRevision,
      });
      return result;
    } catch (error) {
      if (error instanceof ProjectNotFoundError) throw notFound(`项目 ${id} 不存在`);
      if (error instanceof ProjectConflictError) {
        throw conflict("文档已被其他会话修改，请刷新后重试", {
          expectedRevision: error.expectedRevision,
          actualRevision: error.actualRevision,
        });
      }
      throw error;
    }
  }

  async changelog(id: string) {
    const doc = await this.store.get(id);
    if (!doc) throw notFound(`项目 ${id} 不存在`);
    return this.store.revisions(id);
  }
}