import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseProjectDoc, type ProjectDoc } from "@/domain/project/schema";
import {
  createPatchSession,
  dispatch,
  markError,
  markSaved,
  markSaving,
  pendingOps,
  redo,
  undo,
} from "@/features/editor/patch-session";

const doc: ProjectDoc = parseProjectDoc(
  JSON.parse(readFileSync(path.join(process.cwd(), "tests", "fixtures", "project-minimal.json"), "utf8")) as unknown,
);

describe("编辑会话（patch-session）", () => {
  it("初始为已保存且栈为空", () => {
    const session = createPatchSession(doc, 3);
    expect(session.status).toBe("saved");
    expect(session.revision).toBe(3);
    expect(session.undoStack).toHaveLength(0);
    expect(pendingOps(session)).toEqual([]);
  });

  it("dispatch 应用 patch 并进入 dirty", () => {
    const session = dispatch(createPatchSession(doc), [{ op: "replace", path: "/name", value: "改名" }]);
    expect(session.doc.name).toBe("改名");
    expect(session.status).toBe("dirty");
    expect(session.undoStack).toHaveLength(1);
    expect(doc.name).not.toBe("改名"); // 原文档不被修改
  });

  it("undo / redo 保持文档一致", () => {
    const edited = dispatch(createPatchSession(doc), [{ op: "replace", path: "/canvas/width", value: 1080 }]);
    const undone = undo(edited);
    expect(undone.doc.canvas.width).toBe(doc.canvas.width);
    expect(undone.redoStack).toHaveLength(1);

    const redone = redo(undone);
    expect(redone.doc.canvas.width).toBe(1080);
    expect(redone.undoStack).toHaveLength(1);
  });

  it("多批修改按顺序合并为待提交 ops", () => {
    let session = createPatchSession(doc);
    session = dispatch(session, [{ op: "replace", path: "/name", value: "A" }]);
    session = dispatch(session, [{ op: "replace", path: "/name", value: "B" }]);
    expect(pendingOps(session)).toHaveLength(2);
    expect(session.doc.name).toBe("B");
  });

  it("非法 patch 进入 error 且不改文档", () => {
    const session = dispatch(createPatchSession(doc), [{ op: "replace", path: "/nope", value: 1 }]);
    expect(session.status).toBe("error");
    expect(session.doc).toEqual(doc);
    expect(session.undoStack).toHaveLength(0);
  });

  it("saving → saved 清空撤销栈并保留服务端 revision", () => {
    const edited = dispatch(createPatchSession(doc, 0), [{ op: "replace", path: "/name", value: "X" }]);
    const saving = markSaving(edited);
    expect(saving.status).toBe("saving");

    const saved = markSaved(saving, saving.doc, 7);
    expect(saved.status).toBe("saved");
    expect(saved.revision).toBe(7);
    expect(saved.undoStack).toHaveLength(0);
    expect(saved.redoStack).toHaveLength(0);
  });

  it("markError 记录原因", () => {
    const failed = markError(createPatchSession(doc), "revision conflict");
    expect(failed.status).toBe("error");
    expect(failed.lastError).toBe("revision conflict");
  });
});
