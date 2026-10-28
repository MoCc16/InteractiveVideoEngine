/**
 * 元件样式解析（Phase 4 样式内核）。
 *
 * 目标产品的 style 值同样是 {kind:"literal", value} / {kind:"binding", expr} 包装；
 * binding 里可写 `${theme.accent}` / `${node.标题}` / `${var.x}`。
 * 这里把「元件显式样式 → 项目主题 → 类型默认」三级回退算成最终 CSS 值，
 * 渲染器与属性面板共用同一套语义。
 */
import type { Component, ProjectDoc } from "@/domain/project/schema";

export interface ThemeTokens {
  accent: string;
  accentStrong: string;
  background: string;
  text: string;
}

export const DEFAULT_THEME: ThemeTokens = {
  accent: "#c9a84c",
  accentStrong: "#f0d060",
  background: "#14141f",
  text: "#e8e4d8",
};

export const THEME_PRESETS: Array<{ id: string; name: string; tokens: ThemeTokens }> = [
  { id: "gold", name: "鎏金", tokens: { accent: "#c9a84c", accentStrong: "#f0d060", background: "#14141f", text: "#e8e4d8" } },
  { id: "cool", name: "冷光蓝白", tokens: { accent: "#5b9bff", accentStrong: "#9cc4ff", background: "#0d1626", text: "#eaf2ff" } },
  { id: "tech", name: "科技青", tokens: { accent: "#2fd4c4", accentStrong: "#7ff0e4", background: "#071617", text: "#e2fffb" } },
];

export function readThemeTokens(doc: ProjectDoc): ThemeTokens {
  const raw = (doc.theme?.tokens ?? {}) as Record<string, unknown>;
  return {
    accent: typeof raw.accent === "string" ? raw.accent : DEFAULT_THEME.accent,
    accentStrong: typeof raw.accentStrong === "string" ? raw.accentStrong : DEFAULT_THEME.accentStrong,
    background: typeof raw.background === "string" ? raw.background : DEFAULT_THEME.background,
    text: typeof raw.text === "string" ? raw.text : DEFAULT_THEME.text,
  };
}

export interface StyleContext {
  theme: ThemeTokens;
  fields: Record<string, unknown>;
  vars: Record<string, unknown>;
}

export function buildStyleContext(doc: ProjectDoc, sceneFields?: Record<string, unknown>): StyleContext {
  const vars: Record<string, unknown> = {};
  for (const variable of doc.variables) vars[variable.id] = variable.defaultValue;
  return { theme: readThemeTokens(doc), fields: sceneFields ?? {}, vars };
}

/** 解析 ${theme.x} / ${node.x} / ${var.x}；未知表达式原样返回，便于在画布上看出问题 */
export function resolveExpr(expr: string, ctx: StyleContext): string {
  const match = expr.trim().match(/^\$\{(?:(theme|node|var)\.(.+))?\}$/);
  if (!match || !match[1] || !match[2]) return expr;
  const [, scope, key] = match;
  if (scope === "theme") {
    const value = (ctx.theme as unknown as Record<string, unknown>)[key];
    return typeof value === "string" ? value : expr;
  }
  if (scope === "node") {
    const value = ctx.fields[key];
    return value === undefined ? expr : String(value);
  }
  const value = ctx.vars[key];
  return value === undefined ? expr : String(value);
}

/** 读取一个样式键的原始值（literal → value；binding → 解析表达式；裸值 → 原样） */
export function readStyleValue(component: Component, key: string, ctx: StyleContext): unknown {
  const style = component.style as Record<string, unknown> | undefined;
  const raw = style?.[key];
  if (raw === undefined) return undefined;
  if (raw && typeof raw === "object") {
    const wrapped = raw as { kind?: string; value?: unknown; expr?: string };
    if (wrapped.kind === "binding" && typeof wrapped.expr === "string") return resolveExpr(wrapped.expr, ctx);
    if ("value" in wrapped) return wrapped.value;
    return undefined;
  }
  return raw;
}

export type TextAlign = "left" | "center" | "right";

export interface ResolvedStyle {
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  color: string;
  backgroundColor?: string;
  textAlign: TextAlign;
  opacity: number;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  boxShadow?: string;
  padding: string;
  objectFit: "cover" | "contain" | "fill";
  whiteSpace: "nowrap" | "normal";
}

function num(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function defaultsFor(component: Component, ctx: StyleContext): ResolvedStyle {
  const type = component.type;
  const isText = type === "text";
  const isButton = type === "button" || type === "actionButton" || type === "endingButton";
  return {
    fontSize: isText ? 28 : isButton ? 20 : 14,
    fontWeight: isButton ? 600 : 400,
    lineHeight: 1.3,
    letterSpacing: 0,
    color: ctx.theme.text,
    backgroundColor: isButton ? "transparent" : undefined,
    textAlign: isText ? "center" : "left",
    opacity: 1,
    borderRadius: isButton ? 6 : 0,
    borderWidth: 1,
    borderColor: type === "group" ? "transparent" : "rgba(255,255,255,0.12)",
    boxShadow: undefined,
    padding: type === "group" ? "0" : "2px 8px",
    objectFit: "cover",
    whiteSpace: "nowrap",
  };
}

export function resolveStyle(component: Component, ctx: StyleContext): ResolvedStyle {
  const base = defaultsFor(component, ctx);
  const read = (key: string) => readStyleValue(component, key, ctx);
  const align = read("textAlign");
  const shadow = read("boxShadow");

  return {
    fontSize: num(read("fontSize"), base.fontSize),
    fontWeight: num(read("fontWeight"), base.fontWeight),
    lineHeight: num(read("lineHeight"), base.lineHeight),
    letterSpacing: num(read("letterSpacing"), base.letterSpacing),
    color: str(read("color"), base.color),
    backgroundColor: (() => {
      const value = read("backgroundColor");
      if (typeof value === "string") return value;
      return base.backgroundColor;
    })(),
    textAlign: align === "left" || align === "center" || align === "right" ? align : base.textAlign,
    opacity: Math.min(Math.max(num(read("opacity"), base.opacity), 0), 1),
    borderRadius: num(read("borderRadius"), base.borderRadius),
    borderWidth: num(read("borderWidth"), base.borderWidth),
    borderColor: str(read("borderColor"), base.borderColor),
    boxShadow: typeof shadow === "string" ? shadow : base.boxShadow,
    padding: str(read("padding"), base.padding),
    objectFit: base.objectFit,
    whiteSpace: read("whiteSpace") === "normal" ? "normal" : base.whiteSpace,
  };
}
