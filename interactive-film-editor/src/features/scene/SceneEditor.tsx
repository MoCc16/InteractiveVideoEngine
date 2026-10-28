"use client";

import { useMemo, useState } from "react";
import { useEditor } from "@/features/editor/EditorProvider";
import { resolveComponentAtPath } from "./paths";
import { LayerTree } from "./LayerTree";
import { PropertyPanel } from "./PropertyPanel";
import { SceneCanvas, type Selection } from "./SceneCanvas";
import { ThemePanel } from "./ThemePanel";
import { componentSpec } from "./registry";
import { buildStyleContext, type StyleContext } from "@/domain/project/style";
import type { Box } from "@/domain/project/anchor";
import type { Component, ProjectLayout, Scene } from "@/domain/project/schema";
import type { JsonPatchOp } from "@/domain/project/patch";
import { useStageZoom } from "@/features/editor/zoom-store";



function sceneLabel(scene: Scene): string {
  return scene.displayTitle || scene.title || scene.id;
}

function LeftRail({
  scene,
  layoutIndex,
  shared,
  root,
  rootPath,
  selectedPath,
  onSelect,
  onChangeLayout,
}: {
  scene: Scene;
  layoutIndex: number;
  shared: ProjectLayout[];
  root: Component;
  rootPath: string;
  selectedPath: string | null;
  onSelect: (selection: Selection) => void;
  onChangeLayout: (index: number) => void;
}) {
  return (
    <aside className="film-col-gap-3 ed-float-left">
      <div>
        <div className="film-h2">{sceneLabel(scene)}</div>
        <div className="film-label">
          {scene.flow.kind} · {scene.id}
        </div>
      </div>
      <label className="film-block">
        <span className="film-label">版式模板</span>
        <select className="film-input film-input-sm" value={layoutIndex} onChange={(event) => onChangeLayout(Number(event.target.value))}>
          {shared.map((item, index) => (
            <option key={item.id} value={index}>
              {item.name ?? item.id}
            </option>
          ))}
        </select>
      </label>
      <LayerTree root={root} rootPath={rootPath} selectedPath={selectedPath} onSelect={onSelect} />
      <ThemePanel />
    </aside>
  );
}

function CanvasFrame({
  width,
  height,
  scale,
  label,
  children,
}: {
  width: number;
  height: number;
  scale: number;
  label: string;
  children: React.ReactNode;
}) {
  const vars = { "--cw": width, "--ch": height, "--scale": scale } as React.CSSProperties;
  return (
    <section className="film-canvas-frame film-stage">
      <div className="film-canvas-viewport" style={vars}>
        <div className="film-canvas-scaled" style={vars}>
          {children}
        </div>
      </div>
      <div className="film-canvas-badge">
        {width}×{height} @ {Math.round(scale * 100)}% · {label}
      </div>
    </section>
  );
}

export function SceneEditor({ sceneId }: { sceneId: string }) {
  const { doc, apply } = useEditor();
  const scene = doc.scenes.find((item) => item.id === sceneId) ?? doc.scenes[0];
  const shared = doc.layouts?.shared ?? [];
  const [layoutIndex, setLayoutIndex] = useState(() =>
    Math.max(
      shared.findIndex((layout) => layout.id === scene?.layoutId),
      0,
    ),
  );
  const [selected, setSelected] = useState<Selection | null>(null);
  const scale = useStageZoom(0.42);

  const layout = shared[layoutIndex];
  const styleCtx: StyleContext = buildStyleContext(doc, (scene?.fields ?? {}) as Record<string, unknown>);
  const rootPath = `/layouts/shared/${layoutIndex}/root`;
  const canvasBox = useMemo<Box>(() => ({ x: 0, y: 0, width: doc.canvas.width, height: doc.canvas.height }), [doc.canvas]);
  const resolveAsset = (id: string) =>
    doc.assets?.videos?.[id]?.src ?? doc.assets?.images?.[id]?.src ?? doc.assets?.audio?.[id]?.src;
  const selectedPath = selected?.path ?? null;

  const commitLayout = (next: number, target: Scene, ops: (ops: JsonPatchOp[]) => void) => {
    setLayoutIndex(next);
    setSelected(null);
    ops([{ op: "replace", path: `/scenes/${doc.scenes.indexOf(target)}/layoutId`, value: shared[next]?.id ?? "" }]);
  };

  if (!scene) return <div className="film-page-narrow film-label">项目里没有节点</div>;
  if (!layout) return <div className="film-page-narrow film-label">该项目没有版式模板</div>;

  return (
    <div className="ed-scene-stage">
      <LeftRail
        scene={scene}
        layoutIndex={layoutIndex}
        shared={shared}
        root={layout.root}
        rootPath={rootPath}
        selectedPath={selectedPath}
        onSelect={setSelected}
        onChangeLayout={(next) => commitLayout(next, scene, apply)}
      />

      <CanvasFrame width={doc.canvas.width} height={doc.canvas.height} scale={scale} label={componentSpec(layout.root.type).label}>
        <SceneCanvas
          root={layout.root}
          rootPath={rootPath}
          canvas={doc.canvas}
          scale={scale}
          ctx={styleCtx}
          resolveAsset={resolveAsset}
          selectedPath={selectedPath}
          onSelect={setSelected}
          onCommit={apply}
        />
      </CanvasFrame>

      <aside className="ed-float-right">
        <PropertyPanel
          component={resolveComponentAtPath(doc, selectedPath)}
          path={selectedPath}
          parentBox={canvasBox}
          ctx={styleCtx}
          apply={apply}
        />
      </aside>
    </div>
  );
}