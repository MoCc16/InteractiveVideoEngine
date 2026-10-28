import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseProjectDoc } from "@/domain/project/schema";
import { extractEdges, layoutStoryGraph, NODE_HEIGHT, NODE_WIDTH } from "@/features/story-graph/layout";

const load = (name: string) =>
  parseProjectDoc(JSON.parse(readFileSync(path.join(process.cwd(), "tests", "fixtures", name), "utf8")) as unknown);

describe("故事图布局", () => {
  it("从 flow 提取出边：auto / choice / qte / menu", () => {
    const doc = load("project-import-copy.json");
    const edges = extractEdges(doc);
    const kinds = new Set(edges.map((edge) => edge.kind));
    expect(edges.length).toBeGreaterThan(0);
    expect(kinds.has("auto")).toBe(true);
    expect(kinds.has("choice")).toBe(true);
    // 目标项目里存在 qte 与 menu 节点
    expect(kinds.has("qte-success") || kinds.has("qte-fail") || kinds.has("menu")).toBe(true);
  });

  it("起始节点深度为 0，且所有可达节点都排在它右侧", () => {
    const doc = load("project-2.json");
    const layout = layoutStoryGraph(doc);
    const start = layout.nodes.find((node) => node.id === doc.start.sceneId);
    expect(start?.depth).toBe(0);
    const startX = start?.x ?? 0;
    for (const node of layout.nodes) {
      if (node.depth > 0) expect(node.x).toBeGreaterThan(startX);
    }
  });

  it("同层节点不重叠", () => {
    const layout = layoutStoryGraph(load("project-2.json"));
    const byDepth = new Map<number, Array<{ x: number; y: number }>>();
    for (const node of layout.nodes) {
      const list = byDepth.get(node.depth) ?? [];
      list.push(node);
      byDepth.set(node.depth, list);
    }
    for (const list of byDepth.values()) {
      const ys = list.map((node) => node.y).sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i += 1) {
        expect((ys[i] as number) - (ys[i - 1] as number)).toBeGreaterThanOrEqual(NODE_HEIGHT);
      }
    }
  });

  it("孤岛节点被单独标记并仍在画布内", () => {
    const doc = load("project-minimal.json");
    const layout = layoutStoryGraph(doc);
    expect(layout.unreachable.length).toBeGreaterThan(0);
    for (const id of layout.unreachable) {
      const node = layout.nodes.find((item) => item.id === id);
      expect(node).toBeTruthy();
      expect(node!.x).toBeGreaterThanOrEqual(0);
      expect(node!.x + NODE_WIDTH).toBeLessThanOrEqual(layout.width);
    }
  });

  it("布局是确定性的（同输入同输出）", () => {
    const doc = load("project-2.json");
    expect(layoutStoryGraph(doc)).toEqual(layoutStoryGraph(doc));
  });
});
