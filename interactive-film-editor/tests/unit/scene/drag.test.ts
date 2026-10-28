import { describe, expect, it } from "vitest";
import { applyJsonPatch } from "@/domain/project/patch";
import type { Component } from "@/domain/project/schema";
import { moveOps, resizeCornerOps, resizeOps } from "@/features/scene/drag";

const box = { x: 100, y: 200, width: 120, height: 40 };

describe("画布拖动 / 缩放 → patch", () => {
  it("% 锚点：位移写进 offset，不破坏相对布局", () => {
    const component = {
      id: "t",
      type: "text",
      anchors: { left: { value: 50, unit: "%", offset: -100 }, top: { value: 20, unit: "%" } },
    } as Component;
    const ops = moveOps(component, "/root/children/0", box, 30, -10);
    const doc = applyJsonPatch({ root: { children: [component] } }, ops);
    const next = doc.root.children[0] as Component;
    expect(next.anchors?.left).toEqual({ value: 50, unit: "%", offset: -70 });
    expect(next.anchors?.top).toEqual({ value: 20, unit: "%", offset: -10 });
  });

  it("px 锚点：直接改 value", () => {
    const component = {
      id: "b",
      type: "button",
      anchors: { left: { value: 40, unit: "px" }, top: { value: 60, unit: "px" } },
    } as Component;
    const doc = applyJsonPatch({ root: { children: [component] } }, moveOps(component, "/root/children/0", box, 10, 10));
    const next = doc.root.children[0] as Component;
    expect(next.anchors?.left).toEqual({ value: 50, unit: "px" });
    expect(next.anchors?.top).toEqual({ value: 70, unit: "px" });
  });

  it("没有锚点：补 px 锚点（用当前盒子位置）", () => {
    const component = { id: "c", type: "image" } as Component;
    const doc = applyJsonPatch({ root: { children: [component] } }, moveOps(component, "/root/children/0", box, 5, 5));
    const next = doc.root.children[0] as Component;
    // 无锚点时写入的是「落点」：盒子位置 + 位移
    expect(next.anchors?.left).toEqual({ value: 105, unit: "px" });
    expect(next.anchors?.top).toEqual({ value: 205, unit: "px" });
  });

  it("只有 bottom 锚点：向下移使用 bottom 反向补偿，不新增 top", () => {
    const component = {
      id: "f",
      type: "button",
      anchors: { left: { value: 50, unit: "%", offset: -90 }, bottom: { value: 80, unit: "px" } },
    } as Component;
    const doc = applyJsonPatch({ root: { children: [component] } }, moveOps(component, "/root/children/0", box, 0, 20));
    const next = doc.root.children[0] as Component;
    expect(next.anchors?.bottom).toEqual({ value: 60, unit: "px" });
    expect(next.anchors?.top).toBeUndefined();
    expect(next.anchors?.left).toEqual({ value: 50, unit: "%", offset: -90 });
  });

  it("零位移不产生任何 patch", () => {
    const component = { id: "d", type: "text" } as Component;
    expect(moveOps(component, "/root/children/0", box, 0, 0)).toEqual([]);
  });

  it("缩放写入 px 尺寸，且有 8px 下限", () => {
    const component = { id: "e", type: "video", size: { width: { value: 120, unit: "px" } } } as Component;
    const grow = applyJsonPatch({ root: { children: [component] } }, resizeOps(component, "/root/children/0", box, 40, 20));
    const grown = grow.root.children[0] as Component;
    expect(grown.size?.width).toEqual({ value: 160, unit: "px" });
    expect(grown.size?.height).toEqual({ value: 60, unit: "px" });

    const shrink = applyJsonPatch(
      { root: { children: [component] } },
      resizeOps(component, "/root/children/0", box, -500, -500),
    );
    const shrunk = shrink.root.children[0] as Component;
    expect(shrunk.size?.width).toEqual({ value: 8, unit: "px" });
    expect(shrunk.size?.height).toEqual({ value: 8, unit: "px" });
  });
});

describe("四角缩放", () => {
  const box = { x: 100, y: 100, width: 200, height: 100 };
  const component = { id: "c1", type: "text", anchors: { left: { value: 100, unit: "px" }, top: { value: 100, unit: "px" } }, size: { width: { value: 200, unit: "px" }, height: { value: 100, unit: "px" } } };

  it("右下角只改尺寸", () => {
    const ops = resizeCornerOps(component as never, "/c", box, "br", 20, 10);
    expect(ops.some((op) => op.path.endsWith("/anchors/left"))).toBe(false);
    expect(ops.some((op) => op.path.endsWith("/size/width"))).toBe(true);
  });

  it("左上角同时移动与缩小", () => {
    const ops = resizeCornerOps(component as never, "/c", box, "tl", 10, 10);
    expect(ops.some((op) => op.path.endsWith("/anchors/left"))).toBe(true);
    expect(ops.some((op) => op.path.endsWith("/size/height"))).toBe(true);
  });
});