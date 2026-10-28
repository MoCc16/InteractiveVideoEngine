"use client";

import type { ProjectDoc, Scene } from "@/domain/project/schema";
import { buildStyleContext } from "@/domain/project/style";
import type { CSSProperties } from "react";
import { LayoutView } from "@/features/play/PlayStage";
import type { GraphNode } from "./layout";

export type Point = { x: number; y: number };

const FLOW_LABEL: Record<Scene["flow"]["kind"], string> = {
  auto: "播放",
  choice: "选择",
  qte: "QTE",
  ending: "结局",
  menu: "菜单",
  settlement: "结算",
};

const THUMB_SCALE = 0.0458;

function NodeThumb({ doc, scene }: { doc: ProjectDoc; scene: Scene | undefined }) {
  if (!scene) return <div className="ed-node-thumb ed-node-thumb-empty">—</div>;
  const layout = doc.layouts?.shared.find((item) => item.id === scene.layoutId) ?? doc.layouts?.shared[0];
  if (!layout) return <div className="ed-node-thumb ed-node-thumb-empty">—</div>;
  const ctx = buildStyleContext(doc, (scene.fields ?? {}) as Record<string, unknown>);
  return (
    <div className="ed-node-thumb">
      <div className="ed-node-thumb-inner" style={{ "--thumb-scale": THUMB_SCALE } as React.CSSProperties}>
        <LayoutView
          layout={layout}
          ctx={ctx}
          width={doc.canvas.width}
          height={doc.canvas.height}
          resolveAsset={(id) =>
            doc.assets?.videos?.[id]?.src ?? doc.assets?.images?.[id]?.src ?? doc.assets?.audio?.[id]?.src
          }
        />
      </div>
    </div>
  );
}

export function NodeCard({
  node,
  position,
  doc,
  dragging,
  linkSource,
  onDragStart,
  onContextMenu,
  onLinkClick,
}: {
  node: GraphNode;
  position: Point;
  doc: ProjectDoc;
  dragging: boolean;
  linkSource: boolean;
  onDragStart: (event: React.PointerEvent<HTMLDivElement>, node: GraphNode) => void;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>, node: GraphNode) => void;
  onLinkClick: (node: GraphNode) => void;
}) {
  const scene = doc.scenes.find((item) => item.id === node.id);
  return (
    <div
      title={`${node.id} · ${node.kind}`}
      className={`ed-node${node.isStart ? " ed-node-start" : ""}${dragging ? " ed-node-dragging" : ""}${
        linkSource ? " ed-node-link-source" : ""
      }`}
      style={{ "--nx": position.x, "--ny": position.y } as CSSProperties}
      onPointerDown={(event) => onDragStart(event, node)}
      onClick={() => onLinkClick(node)}
      onContextMenu={(event) => onContextMenu(event, node)}
    >
      <span className={`ed-node-dot ed-dot-${node.kind}`} />
      <NodeThumb doc={doc} scene={scene} />
      <div className="ed-node-body">
        <span className="ed-node-chip">{FLOW_LABEL[node.kind]}</span>
        <span className="ed-node-title">{node.title}</span>
        <span className="ed-node-meta">
          {node.id}
          {node.isStart ? " · START" : ""}
          {node.isEnding ? " · 结局" : ""}
          {node.hasVideo ? "" : " · 无视频"}
        </span>
      </div>
    </div>
  );
}