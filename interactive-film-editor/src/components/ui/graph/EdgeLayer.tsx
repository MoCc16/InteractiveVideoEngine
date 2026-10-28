/**
 * 图元语：连线层（唯一的 <svg> 渲染点）。
 * 与 icons 模块同属"视觉原语"，业务组件不得直接写 <svg>（见 eslint no-restricted-syntax）。
 */
import type { GraphEdge, GraphNode } from "@/features/story-graph/layout";
import { NODE_HEIGHT, NODE_WIDTH } from "@/features/story-graph/layout";

const EDGE_COLOR: Record<GraphEdge["kind"], string> = {
  auto: "var(--film-border-strong)",
  choice: "var(--film-accent-gold)",
  "qte-success": "var(--film-success)",
  "qte-fail": "var(--film-danger)",
  menu: "var(--film-text-secondary)",
  settlement: "var(--film-text-secondary)",
};

function edgePath(from: GraphNode, to: GraphNode): string {
  const x1 = from.x + NODE_WIDTH;
  const y1 = from.y + NODE_HEIGHT / 2;
  const x2 = to.x;
  const y2 = to.y + NODE_HEIGHT / 2;
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`;
}

export function EdgeLayer({
  edges,
  nodes,
  width,
  height,
}: {
  edges: GraphEdge[];
  nodes: GraphNode[];
  width: number;
  height: number;
}) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
      {edges.map((edge) => {
        const from = byId.get(edge.from);
        const to = byId.get(edge.to);
        if (!from || !to) return null;
        return (
          <path
            key={edge.id}
            d={edgePath(from, to)}
            fill="none"
            stroke={EDGE_COLOR[edge.kind]}
            strokeWidth={1.4}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}
