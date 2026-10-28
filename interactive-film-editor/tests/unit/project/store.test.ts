import { describe, expect, it } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { FileProjectStore, ProjectNotFoundError } from "@/server/projects/store";
import { parseProjectDoc } from "@/domain/project/schema";

const loadFixture = () =>
  parseProjectDoc(
    JSON.parse(readFileSync(path.join(process.cwd(), "tests", "fixtures", "project-minimal.json"), "utf8")) as unknown,
  );

describe("FileProjectStore（doc + revision 日志）", () => {
  it("create/get/list 往返一致", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "film-store-"));
    const store = new FileProjectStore(dir);
    const doc = loadFixture();
    await store.create(doc, "u_1");

    const loaded = await store.get(doc.id);
    expect(loaded?.name).toBe(doc.name);
    expect(loaded?.scenes).toHaveLength(doc.scenes.length);

    const list = await store.list("u_1");
    expect(list.map((p) => p.id)).toEqual([doc.id]);
    expect(await store.list("u_other")).toEqual([]);
  });

  it("applyPatch 追加 revision 并落盘", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "film-store-"));
    const store = new FileProjectStore(dir);
    const doc = loadFixture();
    await store.create(doc, "u_1");

    const { doc: next, revision } = await store.applyPatch(
      doc.id,
      [{ op: "replace", path: "/canvas/width", value: 1080 }],
      { actorId: "u_1", message: "改画布宽" },
    );
    expect(revision).toBe(1);
    expect(next.canvas.width).toBe(1080);

    const revisions = await store.revisions(doc.id);
    expect(revisions).toHaveLength(1);
    expect(revisions[0]?.ops).toEqual([{ op: "replace", path: "/canvas/width", value: 1080 }]);
    expect(revisions[0]?.message).toBe("改画布宽");

    const raw = JSON.parse(await readFile(path.join(dir, doc.id, "doc.json"), "utf8")) as {
      canvas: { width: number };
    };
    expect(raw.canvas.width).toBe(1080);
  });

  it("非法 patch 失败且不落半成品", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "film-store-"));
    const store = new FileProjectStore(dir);
    const doc = loadFixture();
    await store.create(doc, "u_1");

    await expect(
      store.applyPatch(doc.id, [{ op: "replace", path: "/canvas/nope", value: 1 }], { actorId: "u_1" }),
    ).rejects.toThrowError();

    const after = await store.get(doc.id);
    expect(after?.canvas.width).toBe(doc.canvas.width);
    expect(await store.revisions(doc.id)).toHaveLength(0);
  });

  it("不存在的项目抛 ProjectNotFoundError", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "film-store-"));
    const store = new FileProjectStore(dir);
    await expect(
      store.applyPatch("nope", [{ op: "replace", path: "/name", value: "x" }], { actorId: "u" }),
    ).rejects.toThrowError(ProjectNotFoundError);
  });
});
