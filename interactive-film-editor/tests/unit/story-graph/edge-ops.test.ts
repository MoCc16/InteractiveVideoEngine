import { describe, expect, it } from "vitest";
import { parseProjectDoc, type ProjectDoc } from "@/domain/project/schema";
import { addEdgeOps, removeEdgeOps } from "@/features/story-graph/edge-ops";
import { applyJsonPatch } from "@/domain/project/patch";

function doc(): ProjectDoc {
  return parseProjectDoc({
    schemaVersion: "1.0",
    id: "p",
    name: "edges",
    canvas: { width: 1920, height: 1080, safeAreas: [] },
    start: { sceneId: "a" },
    scenes: [
      { id: "a", title: "A", isStart: true, flow: { kind: "auto" } },
      { id: "b", title: "B", flow: { kind: "choice", choices: [] } },
      { id: "c", title: "C", isEnding: true, flow: { kind: "ending" } },
      { id: "m", title: "M", flow: { kind: "menu", items: [] } },
    ],
  });
}

describe("故事图连线", () => {
  it("auto 节点：写入 nextSceneId", () => {
    const d = doc();
    const result = addEdgeOps(d, "a", "b");
    if (!("ops" in result)) throw new Error(result.reason);
    const next = parseProjectDoc(applyJsonPatch(d, result.ops));
    expect(next.scenes[0]?.flow).toMatchObject({ kind: "auto", nextSceneId: "b" });
  });

  it("choice 节点：追加一个选项", () => {
    const d = doc();
    const result = addEdgeOps(d, "b", "c");
    if (!("ops" in result)) throw new Error(result.reason);
    const next = parseProjectDoc(applyJsonPatch(d, result.ops));
    const flow = next.scenes[1]?.flow;
    expect(flow?.kind).toBe("choice");
    if (flow?.kind === "choice") {
      expect(flow.choices).toHaveLength(1);
      expect(flow.choices[0]?.nextSceneId).toBe("c");
    }
  });

  it("menu 节点：追加菜单项", () => {
    const d = doc();
    const result = addEdgeOps(d, "m", "a");
    if (!("ops" in result)) throw new Error(result.reason);
    const next = parseProjectDoc(applyJsonPatch(d, result.ops));
    const flow = next.scenes[3]?.flow;
    if (flow?.kind === "menu") expect(flow.items[0]?.action).toMatchObject({ type: "goScene", sceneId: "a" });
  });

  it("结局节点不能连线，自连也拒绝", () => {
    const d = doc();
    expect("reason" in addEdgeOps(d, "c", "a")).toBe(true);
    expect("reason" in addEdgeOps(d, "a", "a")).toBe(true);
  });

  it("删除 auto 边", () => {
    const d = doc();
    const linked = addEdgeOps(d, "a", "b");
    if (!("ops" in linked)) throw new Error(linked.reason);
    const withEdge = parseProjectDoc(applyJsonPatch(d, linked.ops));
    const removed = removeEdgeOps(withEdge, { from: "a", to: "b", kind: "auto" });
    if (!("ops" in removed)) throw new Error(removed.reason);
    const next = parseProjectDoc(applyJsonPatch(withEdge, removed.ops));
    expect(next.scenes[0]?.flow).not.toMatchObject({ nextSceneId: "b" });
  });

  it("删除 choice 边：清空 nextSceneId 而不是删选项", () => {
    const d = doc();
    const linked = addEdgeOps(d, "b", "c");
    if (!("ops" in linked)) throw new Error(linked.reason);
    const withEdge = parseProjectDoc(applyJsonPatch(d, linked.ops));
    const removed = removeEdgeOps(withEdge, { from: "b", to: "c", kind: "choice" });
    if (!("ops" in removed)) throw new Error(removed.reason);
    const next = parseProjectDoc(applyJsonPatch(withEdge, removed.ops));
    const flow = next.scenes[1]?.flow;
    if (flow?.kind === "choice") expect(flow.choices[0]?.nextSceneId).toBeUndefined();
  });
});