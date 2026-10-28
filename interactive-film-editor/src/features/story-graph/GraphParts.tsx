"use client";

import type { CSSProperties } from "react";
import type { ProjectDoc } from "@/domain/project/schema";
import { EdgeLayer } from "@/components/ui/graph/EdgeLayer";
import { NODE_HEIGHT, NODE_WIDTH, type GraphEdge, type GraphLayout, type GraphNode } from "./layout";
import { NodeCard } from "./NodeCard";

export type Point = { x: number; y: number };

/** 画布：连线层 + 节点卡（拖拽/右键/连线点击都由外部注入） */
export function GraphCanvas({
  layout,
  doc,
  positions,
  pan,
  dragId,
  linkFrom,
  onCanvasDown,
  onPointerMove,
  onPointerUp,
  onWheel,
  onNodeDragStart,
  onNodeContextMenu,
  onNodeClick,
}: {
  layout: GraphLayout;
  doc: ProjectDoc;
  positions: (node: GraphNode) => Point;
  pan: Point;
  dragId: string | null;
  linkFrom: string | null;
  onCanvasDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: () => void;
  onWheel: (event: React.WheelEvent<HTMLDivElement>) => void;
  onNodeDragStart: (event: React.PointerEvent<HTMLDivElement>, node: GraphNode) => void;
  onNodeContextMenu: (event: React.MouseEvent<HTMLDivElement>, node: GraphNode) => void;
  onNodeClick: (node: GraphNode) => void;
}) {
  const nodes = layout.nodes.map((node) => ({ ...node, ...positions(node) }));
  return (
    <div
      className="ed-graph-canvas"
      style={{ "--gw": layout.width, "--gh": layout.height } as CSSProperties}
      onPointerDown={onCanvasDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <div className="ed-graph-inner" style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}>
        <EdgeLayer edges={layout.edges} nodes={nodes} width={layout.width} height={layout.height} />
        {layout.nodes.map((node) => (
          <NodeCard
            key={node.id}
            node={node}
            position={positions(node)}
            doc={doc}
            dragging={dragId === node.id}
            linkSource={linkFrom === node.id}
            onDragStart={onNodeDragStart}
            onContextMenu={onNodeContextMenu}
            onLinkClick={onNodeClick}
          />
        ))}
      </div>
    </div>
  );
}

/** 右键菜单：连线 / 删除出边 / 关闭 */
export function GraphContextMenu({
  x,
  y,
  edges,
  onLink,
  onRemoveEdge,
  onClose,
}: {
  x: number;
  y: number;
  edges: GraphEdge[];
  onLink: () => void;
  onRemoveEdge: (edge: GraphEdge) => void;
  onClose: () => void;
}) {
  return (
    <div className="ed-context-menu" style={{ left: x, top: y }}>
      <button type="button" onClick={onLink}>
        从这里连线…
      </button>
      {edges.length === 0 ? <div className="ed-context-empty">没有出边</div> : null}
      {edges.map((edge) => (
        <button key={edge.id} type="button" className="ed-context-danger" onClick={() => onRemoveEdge(edge)}>
          删除连线 → {edge.to}
        </button>
      ))}
      <div className="ed-context-sep" />
      <button type="button" onClick={onClose}>
        关闭
      </button>
    </div>
  );
}

export const NODE_SIZE = { width: NODE_WIDTH, height: NODE_HEIGHT };
/** 故事图头部：标题 + 统计 + 连线提示 + 操作提示 */
export function GraphHeader({
  nodeCount,
  edgeCount,
  unreachable,
  linkFrom,
  notice,
}: {
  nodeCount: number;
  edgeCount: number;
  unreachable: number;
  linkFrom: string | null;
  notice: string | null;
}) {
  return (
    <>
      <div className="app-section-head">
        <span className="app-section-title">故事图</span>
        <span className="app-section-sub">
          {nodeCount} 个节点 · {edgeCount} 条连线
          {unreachable > 0 ? ` · ${unreachable} 个孤岛` : ""} · 拖节点移动 · 右键菜单 · Ctrl+滚轮缩放
        </span>
      </div>
      {notice ? <div className="film-label film-accent">{notice}</div> : null}
      {linkFrom ? (
        <div className="ed-link-banner">
          连线中：从 <b>{linkFrom}</b> 出发 · 点目标节点完成 · Esc 取消
        </div>
      ) : null}
      <p className="film-label">
        连线写回 flow：播放→nextSceneId、选择→新增选项、QTE→成功分支、菜单→新增菜单项、结算→下一章；拖动位置仅本次会话有效。
      </p>
    </>
  );
}