import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { PROJECT_SCHEMA_VERSION, parseProjectDoc } from "@/domain/project/schema";

const FIXTURES = [
  "project-minimal.json",
  "project-2.json",
  "project-import-copy.json",
];

const load = (name: string) =>
  JSON.parse(readFileSync(path.join(process.cwd(), "tests", "fixtures", name), "utf8")) as unknown;

const ALLOWED_FLOW_KINDS = new Set(["auto", "choice", "qte", "ending", "menu", "settlement"]);

describe("Project v1.0 schema — 真实项目文档兼容性", () => {
  it.each(FIXTURES)("接受真实项目 %s", (name) => {
    const doc = parseProjectDoc(load(name));
    expect(doc.schemaVersion).toBe(PROJECT_SCHEMA_VERSION);
    expect(doc.scenes.length).toBeGreaterThan(0);
    expect(doc.start.sceneId).toBeTruthy();
    expect(doc.canvas.width).toBeGreaterThan(0);
  });

  it.each(FIXTURES)("%s 的每个节点 flow.kind 都在已知集合内", (name) => {
    const doc = parseProjectDoc(load(name));
    for (const scene of doc.scenes) {
      expect(ALLOWED_FLOW_KINDS.has(scene.flow.kind)).toBe(true);
    }
  });

  it("保留未知字段（passthrough），避免迁移丢数据", () => {
    const raw = load("project-minimal.json") as Record<string, unknown>;
    const doc = parseProjectDoc({ ...raw, xUnknownTopLevel: { keep: true } }) as Record<string, unknown>;
    expect(doc.xUnknownTopLevel).toEqual({ keep: true });
  });

  it("拒绝错误的 schemaVersion", () => {
    const raw = load("project-minimal.json") as Record<string, unknown>;
    expect(() => parseProjectDoc({ ...raw, schemaVersion: "2.0" })).toThrowError();
  });

  it("解析 choice 节点时给出默认值（appearAt=0, sortOrder=0）", () => {
    const raw = JSON.parse(
      JSON.stringify(load("project-2.json")),
    ) as Record<string, unknown> & { scenes: Array<Record<string, unknown>> };
    const choiceScene = raw.scenes.find((s) => (s.flow as { kind?: string }).kind === "choice");
    expect(choiceScene).toBeTruthy();
    const flow = choiceScene?.flow as { choices: Array<Record<string, unknown>> };
    for (const choice of flow.choices) {
      delete choice.appearAt;
      delete choice.sortOrder;
    }
    const doc = parseProjectDoc(raw);
    const parsed = doc.scenes.find((s) => s.flow.kind === "choice");
    if (!parsed || parsed.flow.kind !== "choice") throw new Error("choice scene missing");
    expect(parsed.flow.choices[0]?.appearAt).toBe(0);
    expect(parsed.flow.choices[0]?.sortOrder).toBe(0);
  });
});
