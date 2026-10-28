/**
 * 编辑会话（纯函数，便于测试）：文档 + 撤销/重做 + 保存状态。
 * 与服务端约定一致：每次提交 ops，服务端按 revision 追加。
 *
 * 撤销/重做基于「批次」：dispatch 时立刻按当前文档算出反向 patch 并保存，
 * 因此 undo 不依赖重放，也不会因为文档已变更而算错旧值。
 */
import { applyJsonPatch, invertJsonPatch, type JsonPatchOp } from "@/domain/project/patch";
import type { ProjectDoc } from "@/domain/project/schema";

export type SaveStatus = "saved" | "dirty" | "saving" | "error";

export interface PatchBatch {
  ops: JsonPatchOp[];
  inverse: JsonPatchOp[];
}

export interface PatchSession {
  doc: ProjectDoc;
  revision: number;
  undoStack: PatchBatch[];
  redoStack: PatchBatch[];
  status: SaveStatus;
  lastError?: string;
}

export function createPatchSession(doc: ProjectDoc, revision = 0): PatchSession {
  return { doc, revision, undoStack: [], redoStack: [], status: "saved" };
}

/** 本地应用一批 patch；失败则原样返回（显式失败，不做半成品） */
export function dispatch(session: PatchSession, ops: readonly JsonPatchOp[]): PatchSession {
  if (ops.length === 0) return session;
  const batch = [...ops];
  let nextDoc: ProjectDoc;
  let inverse: JsonPatchOp[];
  try {
    inverse = invertJsonPatch(session.doc, batch);
    nextDoc = applyJsonPatch(session.doc, batch);
  } catch {
    return { ...session, status: "error", lastError: "局部修改无法应用到文档" };
  }
  return {
    doc: nextDoc,
    revision: session.revision,
    undoStack: [...session.undoStack, { ops: batch, inverse }],
    redoStack: [],
    status: "dirty",
  };
}

export function undo(session: PatchSession): PatchSession {
  const last = session.undoStack[session.undoStack.length - 1];
  if (!last) return session;
  return {
    doc: applyJsonPatch(session.doc, last.inverse),
    revision: session.revision,
    undoStack: session.undoStack.slice(0, -1),
    redoStack: [...session.redoStack, last],
    status: "dirty",
  };
}

export function redo(session: PatchSession): PatchSession {
  const next = session.redoStack[session.redoStack.length - 1];
  if (!next) return session;
  return {
    doc: applyJsonPatch(session.doc, next.ops),
    revision: session.revision,
    undoStack: [...session.undoStack, next],
    redoStack: session.redoStack.slice(0, -1),
    status: "dirty",
  };
}

export function markSaving(session: PatchSession): PatchSession {
  return { ...session, status: "saving", lastError: undefined };
}

export function markSaved(session: PatchSession, doc: ProjectDoc, revision: number): PatchSession {
  return { ...session, doc, revision, undoStack: [], redoStack: [], status: "saved", lastError: undefined };
}

export function markError(session: PatchSession, message: string): PatchSession {
  return { ...session, status: "error", lastError: message };
}

/** 待提交的 ops：所有未保存批次的 ops 按顺序合并 */
export function pendingOps(session: PatchSession): JsonPatchOp[] {
  return session.undoStack.flatMap((batch) => batch.ops);
}
