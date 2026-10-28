/**
 * 项目文档存储：doc + revision 日志。
 *
 * 设计目标（对应"业务模型不重写"）：
 * - DB 里**没有** scene/chapter/variable/layout 表，只有一个 doc(JSON) + 一条条 patch。
 * - 领域模型始终是 `src/domain/project/schema.ts`；DB 只是信封。
 * - 迁移到 morph（Prisma/MySQL）时，只需把 FileProjectStore 换成 PrismaProjectStore，
 *   接口与调用方不变，业务模型零改动。
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { applyJsonPatch, type JsonPatchOp } from "@/domain/project/patch";
import { parseProjectDoc, type ProjectDoc } from "@/domain/project/schema";

export interface ProjectSummary {
  id: string;
  name: string;
  ownerId: string;
  revision: number;
  updatedAt: string;
}

export interface ProjectRevision {
  projectId: string;
  revision: number;
  ops: JsonPatchOp[];
  actorId: string;
  message?: string;
  createdAt: string;
}

export interface ProjectStore {
  list(ownerId: string): Promise<ProjectSummary[]>;
  get(id: string): Promise<ProjectDoc | null>;
  create(doc: ProjectDoc, ownerId: string): Promise<ProjectDoc>;
  applyPatch(
    id: string,
    ops: readonly JsonPatchOp[],
    meta: { actorId: string; message?: string; expectedRevision?: number },
  ): Promise<{ doc: ProjectDoc; revision: number }>;
  revisions(id: string): Promise<ProjectRevision[]>;
  remove(id: string): Promise<void>;
  ownerOf(id: string): Promise<string | null>;
}

export class ProjectNotFoundError extends Error {
  constructor(readonly projectId: string) {
    super(`project ${projectId} not found`);
    this.name = "ProjectNotFoundError";
  }
}

export class ProjectConflictError extends Error {
  constructor(
    readonly projectId: string,
    readonly expectedRevision: number,
    readonly actualRevision: number,
  ) {
    super(`project ${projectId} revision conflict: expected ${expectedRevision}, actual ${actualRevision}`);
    this.name = "ProjectConflictError";
  }
}

/** 文件实现：一个项目一个 doc.json + 一条 revisions.jsonl（追加写） */
export class FileProjectStore implements ProjectStore {
  constructor(private readonly rootDir: string) {}

  private dir(id: string) {
    return path.join(this.rootDir, id);
  }

  private async readMeta(id: string): Promise<{ ownerId: string; revision: number; updatedAt: string } | null> {
    try {
      const raw = await fs.readFile(path.join(this.dir(id), "meta.json"), "utf8");
      return JSON.parse(raw) as { ownerId: string; revision: number; updatedAt: string };
    } catch {
      return null;
    }
  }

  async list(ownerId: string): Promise<ProjectSummary[]> {
    await fs.mkdir(this.rootDir, { recursive: true });
    const entries = await fs.readdir(this.rootDir, { withFileTypes: true });
    const out: ProjectSummary[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const meta = await this.readMeta(entry.name);
      if (!meta || meta.ownerId !== ownerId) continue;
      const doc = await this.get(entry.name);
      if (!doc) continue;
      out.push({
        id: doc.id,
        name: doc.name,
        ownerId: meta.ownerId,
        revision: meta.revision,
        updatedAt: meta.updatedAt,
      });
    }
    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async get(id: string): Promise<ProjectDoc | null> {
    try {
      const raw = await fs.readFile(path.join(this.dir(id), "doc.json"), "utf8");
      return parseProjectDoc(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async create(doc: ProjectDoc, ownerId: string): Promise<ProjectDoc> {
    const validated = parseProjectDoc(doc);
    const dir = this.dir(validated.id);
    await fs.mkdir(dir, { recursive: true });
    const now = new Date().toISOString();
    await fs.writeFile(path.join(dir, "doc.json"), JSON.stringify(validated, null, 2), "utf8");
    await fs.writeFile(
      path.join(dir, "meta.json"),
      JSON.stringify({ ownerId, revision: 0, updatedAt: now }, null, 2),
      "utf8",
    );
    return validated;
  }

  async applyPatch(
    id: string,
    ops: readonly JsonPatchOp[],
    meta: { actorId: string; message?: string; expectedRevision?: number },
  ): Promise<{ doc: ProjectDoc; revision: number }> {
    const current = await this.get(id);
    if (!current) throw new ProjectNotFoundError(id);
    const metaFile = await this.readMeta(id);
    if (!metaFile) throw new ProjectNotFoundError(id);
    if (meta.expectedRevision !== undefined && meta.expectedRevision !== metaFile.revision) {
      throw new ProjectConflictError(id, meta.expectedRevision, metaFile.revision);
    }

    // 先验证再落盘：patch 结果必须仍是合法文档（显式失败，不写半成品）
    const nextDoc = parseProjectDoc(applyJsonPatch(current, ops));
    const revision = metaFile.revision + 1;
    const record: ProjectRevision = {
      projectId: id,
      revision,
      ops: [...ops],
      actorId: meta.actorId,
      message: meta.message,
      createdAt: new Date().toISOString(),
    };

    const dir = this.dir(id);
    await fs.writeFile(path.join(dir, "doc.json"), JSON.stringify(nextDoc, null, 2), "utf8");
    await fs.appendFile(path.join(dir, "revisions.jsonl"), JSON.stringify(record) + "\n", "utf8");
    await fs.writeFile(
      path.join(dir, "meta.json"),
      JSON.stringify({ ownerId: metaFile.ownerId, revision, updatedAt: record.createdAt }, null, 2),
      "utf8",
    );
    return { doc: nextDoc, revision };
  }

  async revisions(id: string): Promise<ProjectRevision[]> {
    try {
      const raw = await fs.readFile(path.join(this.dir(id), "revisions.jsonl"), "utf8");
      return raw
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as ProjectRevision);
    } catch {
      return [];
    }
  }  async remove(id: string): Promise<void> {
    await fs.rm(this.dir(id), { recursive: true, force: true });
  }

  async ownerOf(id: string): Promise<string | null> {
    const meta = await this.readMeta(id);
    return meta?.ownerId ?? null;
  }
}
