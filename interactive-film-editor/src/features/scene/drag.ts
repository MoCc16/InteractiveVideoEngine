/**
 * 画布交互的纯数学：把像素位移翻译成锚点/尺寸的 patch。
 *
 * 约定（与目标产品一致）：
 * - 优先调整已有锚点：有 left 改 left，只有 right 就改 right（反向补偿），避免拉伸冲突；
 * - % 锚点的位移写进 `offset`（offset 是像素），不破坏相对布局；
 * - 完全没有锚点时，一次性写入 left+top（像素落点）；
 * - 尺寸写 px，最小 8px。
 */
import type { JsonPatchOp } from "@/domain/project/patch";
import type { Component } from "@/domain/project/schema";
import type { Box } from "@/domain/project/anchor";

const MIN_SIZE = 8;

type Side = "left" | "right" | "top" | "bottom";

const OPPOSITE: Record<Side, Side> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

function shifted(anchor: { value: number; unit: "%" | "px"; offset?: number }, delta: number) {
  if (anchor.unit === "%") return { ...anchor, offset: (anchor.offset ?? 0) + delta };
  return { ...anchor, value: anchor.value + delta };
}

function axisOps(
  component: Component,
  path: string,
  side: Side,
  delta: number,
  fallbackValue: number,
): JsonPatchOp[] {
  const anchors = component.anchors;
  const primary = anchors?.[side];
  if (primary) return [{ op: "replace", path: `${path}/anchors/${side}`, value: shifted(primary, delta) }];

  const opposite = anchors?.[OPPOSITE[side]];
  if (opposite) {
    // 例如只有 bottom：向下移 = bottom 减小
    return [{ op: "replace", path: `${path}/anchors/${OPPOSITE[side]}`, value: shifted(opposite, -delta) }];
  }

  return [{ op: "add", path: `${path}/anchors/${side}`, value: { value: fallbackValue + delta, unit: "px" } }];
}

/** 拖动：dx/dy 是画布坐标系下的像素位移 */
export function moveOps(component: Component, path: string, box: Box, dx: number, dy: number): JsonPatchOp[] {
  if (dx === 0 && dy === 0) return [];

  if (!component.anchors) {
    return [
      {
        op: "add",
        path: `${path}/anchors`,
        value: {
          left: { value: box.x + dx, unit: "px" },
          top: { value: box.y + dy, unit: "px" },
        },
      },
    ];
  }

  return [...axisOps(component, path, "left", dx, box.x), ...axisOps(component, path, "top", dy, box.y)];
}

function sizeOps(
  component: Component,
  path: string,
  key: "width" | "height",
  delta: number,
  current: number,
): JsonPatchOp[] {
  const next = Math.max(MIN_SIZE, Math.round(current + delta));
  const value = { value: next, unit: "px" as const };
  if (!component.size) return [{ op: "add", path: `${path}/size`, value: { [key]: value } }];
  return [{ op: "add", path: `${path}/size/${key}`, value }];
}

/** 右下角缩放：dw/dh 为像素位移 */
export function resizeOps(component: Component, path: string, box: Box, dw: number, dh: number): JsonPatchOp[] {
  const ops: JsonPatchOp[] = [];
  if (dw !== 0) ops.push(...sizeOps(component, path, "width", dw, box.width));
  if (dh !== 0) ops.push(...sizeOps(component, path, "height", dh, box.height));
  return ops;
}

export type Corner = "tl" | "tr" | "bl" | "br";

/**
 * 四角缩放：把位移拆成「移动 + 改尺寸」。
 * 例如拖左上角：位置跟手（dx/dy），宽高反向变化；右下角只改尺寸。
 */
export function resizeCornerOps(
  component: Component,
  path: string,
  box: Box,
  corner: Corner,
  dx: number,
  dy: number,
): JsonPatchOp[] {
  const ops: JsonPatchOp[] = [];
  const movesX = corner === "tl" || corner === "bl";
  const movesY = corner === "tl" || corner === "tr";
  if (movesX && dx !== 0) ops.push(...moveOps(component, path, box, dx, 0));
  if (movesY && dy !== 0) ops.push(...moveOps(component, path, box, 0, dy));

  const dw = corner === "tl" || corner === "bl" ? -dx : dx;
  const dh = corner === "tl" || corner === "tr" ? -dy : dy;
  ops.push(...resizeOps(component, path, box, dw, dh));
  return ops;
}