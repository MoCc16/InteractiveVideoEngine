import { describe, expect, it } from "vitest";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { parseProjectDoc } from "@/domain/project/schema";
import { FileProjectStore } from "@/server/projects/store";
import { ProjectService } from "@/server/projects/service";

const loadFixture = () =>
  parseProjectDoc(
    JSON.parse(readFileSync(path.join(process.cwd(), "tests", "fixtures", "project-minimal.json"), "utf8")) as unknown,
  );

describe("乐观锁（revision 冲突）", () => {
  it("baseRevision 与服务端一致 → 成功并递增", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "film-conflict-"));
    const service = new ProjectService(new FileProjectStore(dir));
    const doc = loadFixture();
    await service.create(doc, "u_demo");

    const first = await service.patch(doc.id, { baseRevision: 0, ops: [{ op: "replace", path: "/name", value: "A" }] }, "u_demo");
    expect(first.revision).toBe(1);

    const second = await service.patch(doc.id, { baseRevision: 1, ops: [{ op: "replace", path: "/name", value: "B" }] }, "u_demo");
    expect(second.revision).toBe(2);
    expect(second.doc.name).toBe("B");
  });

  it("baseRevision 落后 → 409 conflict 且不写入", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "film-conflict-"));
    const store = new FileProjectStore(dir);
    const service = new ProjectService(store);
    const doc = loadFixture();
    await service.create(doc, "u_demo");
    await service.patch(doc.id, { baseRevision: 0, ops: [{ op: "replace", path: "/name", value: "A" }] }, "u_demo");

    await expect(
      service.patch(doc.id, { baseRevision: 0, ops: [{ op: "replace", path: "/name", value: "stale" }] }, "u_demo"),
    ).rejects.toMatchObject({
      status: 409,
      code: "revision_conflict",
      details: { expectedRevision: 0, actualRevision: 1 },
    });

    const current = await service.get(doc.id);
    expect(current.name).toBe("A");
    expect(await service.changelog(doc.id)).toHaveLength(1);
  });

  it("不带 baseRevision → 仍然允许写入（脚本/迁移场景）", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "film-conflict-"));
    const service = new ProjectService(new FileProjectStore(dir));
    const doc = loadFixture();
    await service.create(doc, "u_demo");
    const result = await service.patch(doc.id, { ops: [{ op: "replace", path: "/name", value: "no-base" }] }, "u_demo");
    expect(result.revision).toBe(1);
  });
});
