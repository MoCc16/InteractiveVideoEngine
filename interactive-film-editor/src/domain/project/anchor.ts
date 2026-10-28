/**
 * 锚点解析：把「四边锚点 + 尺寸」算成画布坐标。
 *
 * 目标产品语义（逆向结论）：
 * - 锚点单位是 % 或 px，作用于**父容器**；offset 是像素微调（可负）。
 * - 同时有 left 与 right 且没有显式宽度 → 拉伸（宽 = 父宽 - left - right）。
 * - 只有 left/right 之一 → 按该边定位，宽度取 size.width（auto 视为内容宽）。
 * - 都没有 → 水平居中。
 * - 纵向同构（top/bottom）。
 * - 允许负锚点：版式模板会用负值让元件超出父容器（如顶部 −13%）。
 */
import type { Component } from "@/domain/project/schema";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResolveOptions {
  /** auto 尺寸时的内容宽高（按元件类型给默认值） */
  autoWidth?: number;
  autoHeight?: number;
}

type AxisSpec = { value: number; unit: "%" | "px"; offset?: number } | undefined;

function toPx(spec: NonNullable<AxisSpec>, base: number): number {
  const raw = spec.unit === "%" ? (base * spec.value) / 100 : spec.value;
  return raw + (spec.offset ?? 0);
}

function resolveAxis(
  start: AxisSpec,
  end: AxisSpec,
  explicit: { value: number; unit: "%" | "px" | "auto" } | undefined,
  parentStart: number,
  parentSize: number,
  autoSize: number,
): { start: number; size: number } {
  const startPx = start ? toPx(start, parentSize) : undefined;
  const endPx = end ? toPx(end, parentSize) : undefined;

  if (startPx !== undefined && endPx !== undefined && !explicit) {
    return { start: parentStart + startPx, size: Math.max(parentSize - startPx - endPx, 0) };
  }

  if (explicit && explicit.unit !== "auto") {
    const size = explicit.unit === "%" ? (parentSize * explicit.value) / 100 : explicit.value;
    if (startPx !== undefined) return { start: parentStart + startPx, size };
    if (endPx !== undefined) return { start: parentStart + parentSize - endPx - size, size };
    return { start: parentStart + (parentSize - size) / 2, size };
  }

  const size = autoSize;
  if (startPx !== undefined) return { start: parentStart + startPx, size };
  if (endPx !== undefined) return { start: parentStart + parentSize - endPx - size, size };
  return { start: parentStart + (parentSize - size) / 2, size };
}

/** 计算一个元件在父容器内的盒子（父容器用同一坐标系） */
export function resolveBox(component: Component, parent: Box, options: ResolveOptions = {}): Box {
  const anchors = component.anchors ?? {};
  const size = component.size ?? {};

  const horizontal = resolveAxis(
    anchors.left,
    anchors.right,
    size.width,
    parent.x,
    parent.width,
    options.autoWidth ?? 200,
  );
  const vertical = resolveAxis(
    anchors.top,
    anchors.bottom,
    size.height,
    parent.y,
    parent.height,
    options.autoHeight ?? 40,
  );

  return {
    x: Math.round(horizontal.start),
    y: Math.round(vertical.start),
    width: Math.round(horizontal.size),
    height: Math.round(vertical.size),
  };
}

/** 画布根容器：0,0 + 画布尺寸 */
export function canvasBox(width: number, height: number): Box {
  return { x: 0, y: 0, width, height };
}
