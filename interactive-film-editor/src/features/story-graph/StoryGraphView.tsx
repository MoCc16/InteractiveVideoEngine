"use client";

import { useMemo, useState } from "react";
import { useEditor } from "@/features/editor/EditorProvider";
import { GraphCanvas, GraphContextMenu, GraphHeader } from "./GraphParts";
import { layoutStoryGraph, type GraphEdge, type GraphNode } from "./layout";
import { addEdgeOps, removeEdgeOps } from "./edge-ops";
import { useGraphGestures } from "./use-graph-gestures";

/** 故事图：节点卡 + 连线；支持拖节点、平移、Ctrl+滚轮缩放、右键连线/删边 */
export function StoryGraphView() {
  const { doc, apply } = useEditor();
  const layout = useMemo(() => layoutStoryGraph(doc), [doc]);
  const gestures = useGraphGestures();
  const [menu, setMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { linkFrom, setLinkFrom } = gestures;
  const linkTo = (target: GraphNode) => {
    if (!linkFrom) return;
    if (linkFrom === target.id) {
      setLinkFrom(null);
      return;
    }
    const result = addEdgeOps(doc, linkFrom, target.id);
    if ("reason" in result) setNotice(result.reason);
    else {
      apply(result.ops);
      setNotice(`已连线：${linkFrom} → ${target.id}`);
    }
    setLinkFrom(null);
  };

  const removeEdge = (edge: GraphEdge) => {
    const result = removeEdgeOps(doc, edge);
    if ("reason" in result) setNotice(result.reason);
    else {
      apply(result.ops);
      setNotice(`已删除连线：${edge.from} → ${edge.to}`);
    }
    setMenu(null);
  };

  const menuEdges = menu ? layout.edges.filter((edge) => edge.from === menu.nodeId) : [];
  return (
    <div>
      <GraphHeader
        nodeCount={layout.nodes.length}
        edgeCount={layout.edges.length}
        unreachable={layout.unreachable.length}
        linkFrom={linkFrom}
        notice={notice}
      />
      <GraphCanvas
        layout={layout}
        doc={doc}
        positions={gestures.positionOf}
        pan={gestures.pan}
        dragId={gestures.dragId}
        linkFrom={linkFrom}
        onCanvasDown={(event) => {
          setMenu(null);
          gestures.onCanvasDown(event);
        }}
        onPointerMove={gestures.onPointerMove}
        onPointerUp={gestures.endDrag}
        onWheel={gestures.onWheel}
        onNodeDragStart={gestures.onNodeDown}
        onNodeContextMenu={(event, node) => {
          event.preventDefault();
          setMenu({ nodeId: node.id, x: event.clientX, y: event.clientY });
        }}
        onNodeClick={linkTo}
      />

      {menu ? (
        <GraphContextMenu
          x={menu.x}
          y={menu.y}
          edges={menuEdges}
          onLink={() => {
            setLinkFrom(menu.nodeId);
            setMenu(null);
            setNotice("点一个目标节点完成连线");
          }}
          onRemoveEdge={removeEdge}
          onClose={() => setMenu(null)}
        />
      ) : null}

    </div>
  );
}