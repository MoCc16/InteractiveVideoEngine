"use client";

import type { Component } from "@/domain/project/schema";
import { componentSpec } from "./registry";
import type { Selection } from "./SceneCanvas";

/** 图层树：缩进展示元件树，点击选中 */
export function LayerTree({
  root,
  rootPath,
  selectedPath,
  onSelect,
}: {
  root: Component;
  rootPath: string;
  selectedPath: string | null;
  onSelect: (selection: Selection) => void;
}) {
  const rows: Array<{ component: Component; path: string; depth: number }> = [];
  const walk = (component: Component, path: string, depth: number) => {
    rows.push({ component, path, depth });
    (component.children ?? []).forEach((child, index) => walk(child, `${path}/children/${index}`, depth + 1));
  };
  walk(root, rootPath, 0);

  return (
    <div className="film-col-gap">
      <div className="film-label">图层 · {rows.length}</div>
      {rows.map((row) => {
        const spec = componentSpec(row.component.type);
        const active = row.path === selectedPath;
        return (
          <button
            key={row.path}
            type="button"
            onClick={() => onSelect({ path: row.path, component: row.component })}
            className={`film-listitem film-input-sm film-truncate film-tree-row${active ? " film-listitem-active" : ""}`}
            style={{ "--depth": row.depth } as React.CSSProperties}
          >
            {spec.label} · {row.component.id}
          </button>
        );
      })}
    </div>
  );
}