"use client";

import { useEffect, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { resolveBox, type Box } from "@/domain/project/anchor";
import type { JsonPatchOp } from "@/domain/project/patch";
import type { Component } from "@/domain/project/schema";
import { resolveStyle, type StyleContext } from "@/domain/project/style";
import { componentSpec } from "./registry";
import { ComponentPreview, HAS_CUSTOM_PREVIEW } from "./renderers";
import { moveOps, resizeCornerOps, resizeOps, type Corner } from "./drag";
import { SelectionOverlay } from "./SelectionOverlay";
import { InlineTextEditor } from "./InlineTextEditor";

export interface Selection {
  path: string;
  component: Component;
}

function textOf(component: Component): string | null {
  const content = component.content;
  if (!content) return null;
  if (content.kind === "binding") return `{${content.expr ?? ""}}`;
  if (content.kind === "literal") return String(content.value ?? "");
  return null;
}

function styleFor(box: Box, component: Component, ctx: StyleContext, hovered: boolean, selected: boolean): CSSProperties {
  const style = resolveStyle(component, ctx);
  const isGroup = component.type === "group";
  return {
    position: "absolute",
    left: box.x,
    top: box.y,
    width: box.width,
    height: box.height,
    boxSizing: "border-box",
    zIndex: component.z ?? 0,
    opacity: style.opacity,
    display: "flex",
    flexDirection: "column",
    alignItems: style.textAlign === "center" ? "center" : style.textAlign === "right" ? "flex-end" : "flex-start",
    justifyContent: isGroup ? "flex-start" : "center",
    textAlign: style.textAlign,
    padding: style.padding,
    borderStyle: isGroup ? "dashed" : "solid",
    borderWidth: style.borderWidth,
    borderColor: selected ? "var(--film-accent)" : hovered ? "var(--film-accent-dim)" : style.borderColor,
    borderRadius: style.borderRadius,
    background: style.backgroundColor,
    color: style.color,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    boxShadow: style.boxShadow,
    outline: selected ? "1px solid var(--film-accent)" : "none",
    outlineOffset: 0,
    overflow: "hidden",
    whiteSpace: style.whiteSpace,
    textOverflow: "ellipsis",
    cursor: "grab",
    userSelect: "none",
  };
}

interface DragState {
  mode: "move" | "resize";
  corner?: Corner;
  path: string;
  component: Component;
  box: Box;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
}

/**
 * 画布：递归渲染（按 z 排序）+ 点选 + 拖动 + 四角缩放 + 双击改字 + 方向键微调。
 * 递归渲染、拖拽状态与命中测试必须共享同一份闭包状态，拆开反而要透传 8 个参数；
 * 因此这里豁免 max-lines-per-function，长度上限交给 file-line-count（单文件 200 行内）。
 */
// eslint-disable-next-line max-lines-per-function
export function SceneCanvas({
  root,
  rootPath,
  canvas,
  scale,
  ctx,
  resolveAsset,
  selectedPath,
  onSelect,
  onCommit,
}: {
  root: Component;
  rootPath: string;
  canvas: { width: number; height: number };
  scale: number;
  ctx: StyleContext;
  resolveAsset?: (id: string) => string | undefined;
  selectedPath: string | null;
  onSelect: (selection: Selection) => void;
  onCommit: (ops: JsonPatchOp[]) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [hoverPath, setHoverPath] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ path: string; box: Box; value: string; binding?: boolean } | null>(null);

  const begin = (
    event: ReactPointerEvent<HTMLElement>,
    mode: DragState["mode"],
    component: Component,
    path: string,
    box: Box,
    corner?: Corner,
  ) => {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ mode, corner, path, component, box, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0 });
  };

  const move = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag) return;
    setDrag({ ...drag, dx: (event.clientX - drag.startX) / scale, dy: (event.clientY - drag.startY) / scale });
  };

  const end = () => {
    if (!drag) return;
    const dx = Math.round(drag.dx);
    const dy = Math.round(drag.dy);
    if (Math.abs(dx) + Math.abs(dy) < 2) {
      setDrag(null);
      return;
    }
    const ops =
      drag.mode === "move"
        ? moveOps(drag.component, drag.path, drag.box, dx, dy)
        : drag.corner
          ? resizeCornerOps(drag.component, drag.path, drag.box, drag.corner, dx, dy)
          : resizeOps(drag.component, drag.path, drag.box, dx, dy);
    if (ops.length > 0) onCommit(ops);
    setDrag(null);
  };

  const selectedComponent = selectedPath ? findAt(root, rootPath, selectedPath) : null;

  useEffect(() => {
    if (!selectedPath || !selectedComponent || editing) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key === "Escape") {
        onSelect({ path: selectedPath, component: selectedComponent });
        return;
      }
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        onCommit([{ op: "remove", path: selectedPath }]);
        return;
      }
      const step = event.shiftKey ? 10 : 1;
      const deltas: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      const delta = deltas[event.key];
      if (!delta) return;
      event.preventDefault();
      const parentBox = parentBoxOf(root, rootPath, selectedPath, canvas);
      const spec = componentSpec(selectedComponent.type);
      const box = resolveBox(selectedComponent, parentBox ?? canvasBox(canvas), {
        autoWidth: spec.autoWidth,
        autoHeight: spec.autoHeight,
      });
      onCommit(moveOps(selectedComponent, selectedPath, box, delta[0], delta[1]));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedPath, selectedComponent, editing, onCommit, onSelect, root, rootPath, canvas]);

  const render = (component: Component, parentBox: Box, path: string): ReactNode => {
    const spec = componentSpec(component.type);
    const box = resolveBox(component, parentBox, { autoWidth: spec.autoWidth, autoHeight: spec.autoHeight });
    const selected = path === selectedPath;
    const ghost = drag?.path === path ? { x: drag.dx, y: drag.dy } : null;
    const preview = HAS_CUSTOM_PREVIEW.has(component.type) ? (
      <ComponentPreview component={component} resolveAsset={resolveAsset} />
    ) : null;
    const text = textOf(component);
    const isEditing = editing?.path === path;
    const children = (component.children ?? [])
      .map((child, index) => ({ child, index }))
      .sort((a, b) => (a.child.z ?? 0) - (b.child.z ?? 0) || a.index - b.index);

    return (
      <div
        key={path}
        onPointerDown={(event) => {
          onSelect({ path, component });
          begin(event, "move", component, path, box);
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerEnter={() => setHoverPath(path)}
        onPointerLeave={() => setHoverPath((current) => (current === path ? null : current))}
        onDoubleClick={(event) => {
          if (!spec.editableText) return;
          event.stopPropagation();
          const content = component.content;
          const initial = content?.kind === "binding" ? String(content.expr ?? "") : String(content?.value ?? "");
          setEditing({ path, box, value: initial, binding: content?.kind === "binding" });
        }}
        title={`${spec.label} · ${component.id}`}
        style={{
          ...styleFor(box, component, ctx, hoverPath === path, selected),
          transform: `${component.rotation ? `rotate(${component.rotation}deg) ` : ""}${
            ghost ? `translate(${ghost.x}px, ${ghost.y}px)` : ""
          }`,
        }}
      >
        {component.type === "group" ? null : preview ?? (
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{text ?? spec.placeholder}</span>
        )}
        {children.map(({ child, index }) => render(child, box, `${path}/children/${index}`))}
        {isEditing ? (
          <InlineTextEditor
            box={{ ...box, x: 0, y: 0 }}
            scale={scale}
            value={editing.value}
            onCommit={(next) => {
              onCommit([
                {
                  op: "add",
                  path: `${path}/content`,
                  value: editing.binding ? { kind: "binding", expr: next } : { kind: "literal", value: next },
                },
              ]);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        ) : null}
        {selected && component.type !== "group" ? (
          <SelectionOverlay box={{ ...box, x: 0, y: 0 }} scale={scale} onBegin={(event, corner) => begin(event, "resize", component, path, box, corner)} />
        ) : null}
      </div>
    );
  };

  return (
    <div
      style={{
        position: "relative",
        width: canvas.width,
        height: canvas.height,
        cursor: drag ? "grabbing" : "default",
      }}
    >
      {render(root, canvasBox(canvas), rootPath)}
    </div>
  );
}

function canvasBox(canvas: { width: number; height: number }): Box {
  return { x: 0, y: 0, width: canvas.width, height: canvas.height };
}

function findAt(root: Component, rootPath: string, path: string): Component | null {
  if (path === rootPath) return root;
  const segments = path.split("/");
  let node: Component = root;
  for (let i = 0; i < segments.length - 1; i += 1) {
    if (segments[i] === "children") {
      const index = Number(segments[i + 1]);
      const next = node.children?.[index];
      if (!next) return null;
      node = next;
      i += 1;
    }
  }
  return node;
}

/** 从 root 一路解析到父节点，返回父节点的盒子（用于方向键微调） */
function parentBoxOf(root: Component, rootPath: string, path: string, canvas: { width: number; height: number }): Box | null {
  if (path === rootPath) return null;
  const prefix = rootPath + "/children/";
  if (!path.startsWith(prefix)) return null;
  const rest = path.slice(prefix.length).split("/");
  let node: Component = root;
  let box = canvasBox(canvas);
  for (let i = 0; i < rest.length - 1; i += 1) {
    if (rest[i] !== "children") continue;
    const index = Number(rest[i + 1]);
    const child = node.children?.[index];
    if (!child) return null;
    const spec = componentSpec(child.type);
    box = resolveBox(child, box, { autoWidth: spec.autoWidth, autoHeight: spec.autoHeight });
    node = child;
    i += 1;
  }
  return box;
}