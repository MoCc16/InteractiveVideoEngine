import { describe, expect, it } from "vitest";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readFileSync } from "node:fs";
import { parseProjectDoc } from "@/domain/project/schema";
import { FileProjectStore } from "@/server/projects/store";
import { ProjectService } from "@/server/projects/service";
import { ApiError } from "@/server/http/api-error";

const loadFixture = () =>
  parseProjectDoc(
    JSON.parse(readFileSync(path.join(process.cwd(), "tests", "fixtures", "project-minimal.json"), "utf8")) as unknown,
  );

async function setup() {
  const dir = await mkdtemp(path.join(tmpdir(), "film-service-"));
  const store = new FileProjectStore(dir);
  const service = new ProjectService(store);
  const doc = loadFixture();
  await store.create(doc, "u_demo");
  return { dir, store, service, doc };
}

describe("ProjectService（route 与 store 之间的唯一业务层）", () => {
  it("get 不存在的项目 → 404 ApiError", async () => {
    const { service } = await setup();
    await expect(service.get("nope")).rejects.toMatchObject({ status: 404, code: "not_found" });
  });

  it("create 非法文档 → 422 且不落盘", async () => {
    const { service, store } = await setup();
    await expect(service.create({ schemaVersion: "9.9" }, "u_demo")).rejects.toBeInstanceOf(ApiError);
    expect(await store.list("u_demo")).toHaveLength(1);
  });

  it("patch 成功后 revision + 1，并可从 changelog 读回", async () => {
    const { service, doc } = await setup();
    const result = await service.patch(
      doc.id,
      { baseRevision: 0, ops: [{ op: "replace", path: "/name", value: "新名字" }] },
      "u_demo",
    );
    expect(result.revision).toBe(1);
    expect(result.doc.name).toBe("新名字");

    const changelog = await service.changelog(doc.id);
    expect(changelog).toHaveLength(1);
    expect(changelog[0]?.actorId).toBe("u_demo");
  });

  it("patch 路径不存在 → 400 且文档不变", async () => {
    const { service, doc } = await setup();
    await expect(
      service.patch(doc.id, { ops: [{ op: "replace", path: "/canvas/nope", value: 1 }] }, "u_demo"),
    ).rejects.toMatchObject({ status: 400, code: "bad_request" });
    const after = await service.get(doc.id);
    expect(after.canvas.width).toBe(doc.canvas.width);
  });

  it("patch 结果不是合法文档 → 422（如把 schemaVersion 改成 2.0）", async () => {
    const { service, doc } = await setup();
    await expect(
      service.patch(doc.id, { ops: [{ op: "replace", path: "/schemaVersion", value: "2.0" }] }, "u_demo"),
    ).rejects.toMatchObject({ status: 422, code: "invalid_document" });
  });

  it("空 ops → 400", async () => {
    const { service, doc } = await setup();
    await expect(service.patch(doc.id, { ops: [] }, "u_demo")).rejects.toMatchObject({ status: 400 });
  });

  it("changelog 落盘可读（restart 后仍在）", async () => {
    const { dir, service, doc } = await setup();
    await service.patch(doc.id, { ops: [{ op: "replace", path: "/name", value: "持久化" }] }, "u_demo");
    const raw = await readFile(path.join(dir, doc.id, "revisions.jsonl"), "utf8");
    expect(raw.trim().split("\n")).toHaveLength(1);
  });
});
