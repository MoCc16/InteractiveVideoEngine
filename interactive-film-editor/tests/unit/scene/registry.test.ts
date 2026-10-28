import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { KNOWN_COMPONENT_TYPES, parseProjectDoc, type Component } from "@/domain/project/schema";
import { componentSpec, missingTypes, REGISTERED_TYPES } from "@/features/scene/registry";

describe("元件注册表", () => {
  it("覆盖 schema 里的全部已知类型", () => {
    expect(missingTypes()).toEqual([]);
    expect(REGISTERED_TYPES.length).toBeGreaterThanOrEqual(KNOWN_COMPONENT_TYPES.length);
  });

  it("每个类型都有非空展示名与正尺寸", () => {
    for (const type of KNOWN_COMPONENT_TYPES) {
      const spec = componentSpec(type);
      expect(spec.label.length).toBeGreaterThan(0);
      expect(spec.autoWidth).toBeGreaterThan(0);
      expect(spec.autoHeight).toBeGreaterThan(0);
    }
  });

  it("未知类型有兜底（不抛错，便于向前兼容）", () => {
    const spec = componentSpec("brand-new-widget");
    expect(spec.label).toBe("brand-new-widget");
    expect(spec.autoWidth).toBeGreaterThan(0);
  });

  it("真实项目里出现的元件类型都已登记", () => {
    const doc = parseProjectDoc(
      JSON.parse(
        readFileSync(path.join(process.cwd(), "tests", "fixtures", "project-import-copy.json"), "utf8"),
      ) as unknown,
    );
    const seen = new Set<string>();
    const walk = (node: Component) => {
      seen.add(node.type);
      for (const child of node.children ?? []) walk(child);
    };
    for (const layout of doc.layouts?.shared ?? []) walk(layout.root);

    expect(seen.size).toBeGreaterThan(5);
    for (const type of seen) expect(REGISTERED_TYPES).toContain(type);
  });
});
