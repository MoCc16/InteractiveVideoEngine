import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseProjectDoc, type Component, type ProjectDoc } from "@/domain/project/schema";
import {
  DEFAULT_THEME,
  THEME_PRESETS,
  buildStyleContext,
  readStyleValue,
  readThemeTokens,
  resolveExpr,
  resolveStyle,
} from "@/domain/project/style";

const doc: ProjectDoc = parseProjectDoc(
  JSON.parse(readFileSync(path.join(process.cwd(), "tests", "fixtures", "project-import-copy.json"), "utf8")) as unknown,
);

const ctx = buildStyleContext(doc);

describe("样式解析", () => {
  it("默认主题与项目 token 回退", () => {
    expect(readThemeTokens(doc)).toEqual(DEFAULT_THEME);
    const themed = parseProjectDoc({ ...doc, theme: { tokens: { accent: "#ff0000" } } });
    expect(readThemeTokens(themed).accent).toBe("#ff0000");
    expect(readThemeTokens(themed).text).toBe(DEFAULT_THEME.text);
  });

  it("三套预设各自四色齐全", () => {
    expect(THEME_PRESETS).toHaveLength(3);
    for (const preset of THEME_PRESETS) {
      for (const key of ["accent", "accentStrong", "background", "text"] as const) {
        expect(preset.tokens[key]).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it("literal 覆盖默认值", () => {
    const component = {
      id: "t",
      type: "text",
      style: { fontSize: { kind: "literal", value: 48 }, color: { kind: "literal", value: "#123456" } },
    } as Component;
    const style = resolveStyle(component, ctx);
    expect(style.fontSize).toBe(48);
    expect(style.color).toBe("#123456");
  });

  it("binding 解析 ${theme.*} / ${node.*} / ${var.*}", () => {
    expect(resolveExpr("${theme.accent}", ctx)).toBe(DEFAULT_THEME.accent);
    expect(resolveExpr("${node.标题}", { ...ctx, fields: { 标题: "第一幕" } })).toBe("第一幕");
    expect(resolveExpr("${var.affinity}", { ...ctx, vars: { affinity: 3 } })).toBe("3");
    expect(resolveExpr("${theme.unknown}", ctx)).toBe("${theme.unknown}");
    expect(resolveExpr("plain", ctx)).toBe("plain");
  });

  it("binding 样式值参与解析", () => {
    const component = {
      id: "b",
      type: "button",
      style: { borderColor: { kind: "binding", expr: "${theme.accent}" }, borderRadius: { kind: "literal", value: 999 } },
    } as Component;
    const style = resolveStyle(component, ctx);
    expect(style.borderColor).toBe(DEFAULT_THEME.accent);
    expect(style.borderRadius).toBe(999);
  });

  it("类型默认值：文字居中、按钮加粗、分组无内边距", () => {
    const text = resolveStyle({ id: "t", type: "text" } as Component, ctx);
    expect(text.textAlign).toBe("center");
    expect(text.fontSize).toBe(28);

    const button = resolveStyle({ id: "b", type: "button" } as Component, ctx);
    expect(button.fontWeight).toBe(600);

    const group = resolveStyle({ id: "g", type: "group" } as Component, ctx);
    expect(group.padding).toBe("0");
  });

  it("数值兜底与不透明度裁剪", () => {
    const component = {
      id: "x",
      type: "text",
      style: { fontSize: { kind: "literal", value: "abc" }, opacity: { kind: "literal", value: 3 } },
    } as Component;
    const style = resolveStyle(component, ctx);
    expect(style.fontSize).toBe(28);
    expect(style.opacity).toBe(1);
  });

  it("readStyleValue 支持裸值（旧数据）", () => {
    const component = { id: "y", type: "text", style: { color: "#abcdef" } } as Component;
    expect(readStyleValue(component, "color", ctx)).toBe("#abcdef");
  });

  it("真实项目里的 style 能被解析成具体值", () => {
    const layout = doc.layouts?.shared[0];
    const heading = layout?.root.children?.find((child) => child.id.endsWith("heading"));
    expect(heading).toBeTruthy();
    const style = resolveStyle(heading as Component, ctx);
    expect(style.fontSize).toBeGreaterThan(0);
    expect(style.color).toMatch(/^#|rgb/);
  });
});
