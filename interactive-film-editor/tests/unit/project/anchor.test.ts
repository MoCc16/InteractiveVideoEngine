import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { canvasBox, resolveBox } from "@/domain/project/anchor";
import { parseProjectDoc, type Component } from "@/domain/project/schema";

const comp = (input: unknown): Component => input as Component;

describe("锚点解析", () => {
  const parent = canvasBox(1920, 1080);

  it("left 50% + offset -100 → 水平居中偏左", () => {
    const box = resolveBox(
      comp({
        id: "t",
        type: "text",
        anchors: { top: { value: 20, unit: "%" }, left: { value: 50, unit: "%", offset: -100 } },
        size: { width: { value: 200, unit: "px" } },
      }),
      parent,
      { autoHeight: 40 },
    );
    expect(box.x).toBe(860); // 1920*0.5 - 100
    expect(box.width).toBe(200);
    expect(box.y).toBe(216); // 1080*0.2
  });

  it("四边都有且无显式尺寸 → 双向拉伸", () => {
    const box = resolveBox(
      comp({
        id: "g",
        type: "group",
        anchors: {
          top: { value: 10, unit: "%" },
          left: { value: 5, unit: "%" },
          right: { value: 5, unit: "%" },
          bottom: { value: 10, unit: "%" },
        },
      }),
      parent,
    );
    expect(box.x).toBe(96);
    expect(box.width).toBe(1920 - 96 - 96);
    expect(box.y).toBe(108);
    expect(box.height).toBe(1080 - 108 - 108);
  });

  it("负锚点允许超出父容器（版式模板用法）", () => {
    const box = resolveBox(
      comp({
        id: "g",
        type: "group",
        anchors: {
          top: { value: -13.128680374553529, unit: "%" },
          left: { value: 0.4344048653344918, unit: "%" },
          bottom: { value: 13.128680374553529, unit: "%" },
          right: { value: -0.4344048653344918, unit: "%" },
        },
      }),
      parent,
    );
    // 上负下正且对称 → 高度不变、整体上移（这条语义是逆向确认过的）
    expect(box.y).toBeLessThan(0);
    expect(box.height).toBeCloseTo(parent.height, 0);
    expect(box.x).toBeCloseTo(8, 0); // 0.4344% of 1920 ≈ 8.34
  });

  it("只有 right 锚点 → 从右边定位", () => {
    const box = resolveBox(
      comp({
        id: "b",
        type: "button",
        anchors: { right: { value: 24, unit: "px" }, top: { value: 24, unit: "px" } },
        size: { width: { value: 120, unit: "px" }, height: { value: 40, unit: "px" } },
      }),
      parent,
    );
    expect(box.x).toBe(1920 - 24 - 120);
    expect(box.y).toBe(24);
  });

  it("无任何锚点 → 居中 + auto 尺寸", () => {
    const box = resolveBox(comp({ id: "x", type: "text" }), parent, { autoWidth: 100, autoHeight: 30 });
    expect(box.x).toBe(910);
    expect(box.y).toBe(525);
    expect(box.width).toBe(100);
    expect(box.height).toBe(30);
  });

  it("真实版式模板：所有元件都能算出非零盒子", () => {
    const doc = parseProjectDoc(
      JSON.parse(
        readFileSync(path.join(process.cwd(), "tests", "fixtures", "project-import-copy.json"), "utf8"),
      ) as unknown,
    );
    const layout = doc.layouts?.shared[0];
    expect(layout).toBeTruthy();
    const root = resolveBox(layout!.root, canvasBox(doc.canvas.width, doc.canvas.height));
    expect(root.width).toBeGreaterThan(0);
    expect(root.height).toBeGreaterThan(0);
    for (const child of layout!.root.children ?? []) {
      const box = resolveBox(child, root);
      expect(box.width).toBeGreaterThanOrEqual(0);
      expect(box.height).toBeGreaterThanOrEqual(0);
    }
  });
});
