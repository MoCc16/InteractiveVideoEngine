import { describe, expect, it } from "vitest";
import { parseProjectDoc, type ProjectDoc } from "@/domain/project/schema";
import { resolvePanelLayout } from "@/domain/project/panels";

const base = {
  schemaVersion: "1.0",
  id: "p",
  name: "panels",
  canvas: { width: 1920, height: 1080, safeAreas: [] },
  start: { sceneId: "s1" },
  scenes: [{ id: "s1", title: "开场", isStart: true, flow: { kind: "ending" } }],
  layouts: {
    shared: [
      { id: "lay_a", name: "设置版式", root: { id: "r1", type: "group", children: [] } },
      { id: "lay_b", name: "进度版式", root: { id: "r2", type: "group", children: [] } },
    ],
    bindings: {},
  },
};

describe("面板换皮解析", () => {
  it("未配置 panels 时返回 null（用内建面板）", () => {
    const doc = parseProjectDoc(base) as ProjectDoc;
    expect(resolvePanelLayout(doc, "settings")).toBeNull();
    expect(resolvePanelLayout(doc, "progress")).toBeNull();
  });

  it("配置后按 id 命中版式", () => {
    const doc = parseProjectDoc({ ...base, panels: { settings: "lay_a", progress: "lay_b" } });
    expect(resolvePanelLayout(doc, "settings")?.name).toBe("设置版式");
    expect(resolvePanelLayout(doc, "progress")?.name).toBe("进度版式");
  });

  it("指向不存在的版式时返回 null（回退内建）", () => {
    const doc = parseProjectDoc({ ...base, panels: { settings: "lay_missing" } });
    expect(resolvePanelLayout(doc, "settings")).toBeNull();
  });
});