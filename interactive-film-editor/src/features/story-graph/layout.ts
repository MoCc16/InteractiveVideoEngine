/**
 * 故事图布局（纯函数，可测试）：
 * 目标产品不持久化节点坐标，坐标由前端计算；这里用「从起始节点做 BFS 分层」的确定性布局。
 * 迁移后可以替换为 dagre/elk，但输入输出契约不变（nodes + edges + bounds）。
 */
import type { ProjectDoc, Scene } from "@/domain/project/schema";

export type EdgeKind = "auto" | "choice" | "qte-success" | "qte-fail" | "menu" | "settlement";

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  label?: string;
}

export interface GraphNode {
  id: string;
  title: string;
  kind: Scene["flow"]["kind"];
  isStart: boolean;
  isEnding: boolean;
  hasVideo: boolean;
  depth: number;
  x: number;
  y: number;
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  width: number;
  height: number;
  unreachable: string[];
}

export const NODE_WIDTH = 200;
export const NODE_HEIGHT = 152;
const COLUMN_GAP = 280;
const ROW_GAP = NODE_HEIGHT + 36;
const PADDING = 40;

export function sceneTitle(scene: Scene): string {
  return scene.displayTitle?.trim() || scene.title?.trim() || scene.id;
}

/** 单个节点的出边（按 flow 类型分派，保持每个函数复杂度可控） */
function edgesForScene(scene: Scene): GraphEdge[] {
  const flow = scene.flow;
  switch (flow.kind) {
    case "auto": {
      return flow.nextSceneId
        ? [{ id: `${scene.id}->${flow.nextSceneId}`, from: scene.id, to: flow.nextSceneId, kind: "auto" }]
        : [];
    }
    case "choice": {
      return flow.choices
        .filter((choice) => Boolean(choice.nextSceneId))
        .map((choice) => ({
          id: `${scene.id}->${choice.nextSceneId}#${choice.id}`,
          from: scene.id,
          to: choice.nextSceneId as string,
          kind: "choice" as const,
          label: choice.text || undefined,
        }));
    }
    case "qte": {
      const edges: GraphEdge[] = [];
      for (const qte of flow.qtes) {
        if (qte.onSuccess.nextSceneId) {
          edges.push({
            id: `${scene.id}->${qte.onSuccess.nextSceneId}#ok${qte.id}`,
            from: scene.id,
            to: qte.onSuccess.nextSceneId,
            kind: "qte-success",
            label: "成功",
          });
        }
        if (qte.onFail.nextSceneId) {
          edges.push({
            id: `${scene.id}->${qte.onFail.nextSceneId}#fail${qte.id}`,
            from: scene.id,
            to: qte.onFail.nextSceneId,
            kind: "qte-fail",
            label: "失败",
          });
        }
      }
      return edges;
    }
    case "menu": {
      return flow.items
        .filter((item) => item.action.type === "goScene" && Boolean(item.action.sceneId))
        .map((item) => ({
          id: `${scene.id}->${item.action.sceneId}#${item.id}`,
          from: scene.id,
          to: item.action.sceneId as string,
          kind: "menu" as const,
          label: item.label || undefined,
        }));
    }
    case "settlement": {
      return flow.nextChapterNodeId
        ? [
            {
              id: `${scene.id}->${flow.nextChapterNodeId}`,
              from: scene.id,
              to: flow.nextChapterNodeId,
              kind: "settlement",
            },
          ]
        : [];
    }
    case "ending":
    default:
      return [];
  }
}

/** 从 flow 提取所有出边（一个节点可有多条：choice/qte 分支） */
export function extractEdges(doc: ProjectDoc): GraphEdge[] {
  return doc.scenes.flatMap(edgesForScene);
}
/**
 * 分层布局：
 * 1) 从 start.sceneId 做 BFS 得到深度（含全部可达节点）；
 * 2) 未被访问的节点排到最后一列（unreachable 单独返回，供健康检查用）；
 * 3) 同层按原始 scenes 顺序排列，保证确定性。
 */
export function layoutStoryGraph(doc: ProjectDoc): GraphLayout {
  const edges = extractEdges(doc);
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.from) ?? [];
    list.push(edge.to);
    adjacency.set(edge.from, list);
  }

  const depth = new Map<string, number>();
  const startId = doc.start.sceneId;
  if (doc.scenes.some((scene) => scene.id === startId)) {
    const queue: string[] = [startId];
    depth.set(startId, 0);
    while (queue.length > 0) {
      const current = queue.shift() as string;
      const currentDepth = depth.get(current) ?? 0;
      for (const next of adjacency.get(current) ?? []) {
        if (depth.has(next)) continue;
        depth.set(next, currentDepth + 1);
        queue.push(next);
      }
    }
  }

  const reachable = doc.scenes.filter((scene) => depth.has(scene.id));
  const unreachableScenes = doc.scenes.filter((scene) => !depth.has(scene.id));
  const maxDepth = reachable.reduce((max, scene) => Math.max(max, depth.get(scene.id) ?? 0), 0);
  for (const scene of unreachableScenes) depth.set(scene.id, maxDepth + 1);

  const byDepth = new Map<number, Scene[]>();
  for (const scene of doc.scenes) {
    const d = depth.get(scene.id) ?? 0;
    const list = byDepth.get(d) ?? [];
    list.push(scene);
    byDepth.set(d, list);
  }

  const nodes: GraphNode[] = [];
  for (const [d, scenes] of [...byDepth.entries()].sort((a, b) => a[0] - b[0])) {
    scenes.forEach((scene, rowIndex) => {
      nodes.push({
        id: scene.id,
        title: sceneTitle(scene),
        kind: scene.flow.kind,
        isStart: scene.isStart || scene.id === startId,
        isEnding: scene.isEnding || scene.flow.kind === "ending",
        hasVideo: Boolean(scene.video?.assetId),
        depth: d,
        x: PADDING + d * COLUMN_GAP,
        y: PADDING + rowIndex * ROW_GAP,
      });
    });
  }

  const maxRows = Math.max(...[...byDepth.values()].map((list) => list.length), 1);
  return {
    nodes,
    edges,
    width: PADDING * 2 + (maxDepth + 2) * COLUMN_GAP,
    height: PADDING * 2 + maxRows * ROW_GAP + NODE_HEIGHT,
    unreachable: unreachableScenes.map((scene) => scene.id),
  };
}
