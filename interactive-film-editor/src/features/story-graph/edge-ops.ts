import type { JsonPatchOp } from "@/domain/project/patch";
import type { ProjectDoc, Scene } from "@/domain/project/schema";

export type EdgeSourceKind = Scene["flow"]["kind"];

/**
 * 在故事图上「从 A 连到 B」：按 A 的 flow 类型决定写哪个字段。
 * 返回 JsonPatchOp[]（交给 EditorProvider.apply），无法连线时返回 { reason }。
 */
export function addEdgeOps(
  doc: ProjectDoc,
  fromId: string,
  toId: string,
): { ops: JsonPatchOp[] } | { reason: string } {
  const fromIndex = doc.scenes.findIndex((scene) => scene.id === fromId);
  const from = doc.scenes[fromIndex];
  const to = doc.scenes.find((scene) => scene.id === toId);
  if (!from || !to) return { reason: "节点不存在" };
  if (fromId === toId) return { reason: "不能连到自己" };

  const base = `/scenes/${fromIndex}/flow`;
  switch (from.flow.kind) {
    case "auto":
      return { ops: [{ op: "add", path: `${base}/nextSceneId`, value: toId }] };
    case "settlement":
      return { ops: [{ op: "add", path: `${base}/nextChapterNodeId`, value: toId }] };
    case "choice":
      return {
        ops: [
          {
            op: "add",
            path: `${base}/choices/-`,
            value: { id: `c_${Math.random().toString(36).slice(2, 8)}`, text: to.displayTitle || to.title || "新选项", appearAt: 0, sortOrder: from.flow.choices.length, nextSceneId: toId },
          },
        ],
      };
    case "menu":
      return {
        ops: [
          {
            op: "add",
            path: `${base}/items/-`,
            value: {
              id: `i_${Math.random().toString(36).slice(2, 8)}`,
              label: to.displayTitle || to.title || "菜单项",
              action: { type: "goScene", sceneId: toId },
            },
          },
        ],
      };
    case "qte": {
      const qte = from.flow.qtes[0];
      if (!qte) return { reason: "该 QTE 节点还没有判定动作" };
      return { ops: [{ op: "add", path: `${base}/qtes/0/onSuccess/nextSceneId`, value: toId }] };
    }
    case "ending":
    default:
      return { reason: "结局节点没有出边" };
  }
}

/** 删除一条出边（按边的语义定位到 flow 字段） */
export function removeEdgeOps(
  doc: ProjectDoc,
  edge: { from: string; to: string; kind: string; label?: string },
): { ops: JsonPatchOp[] } | { reason: string } {
  const fromIndex = doc.scenes.findIndex((scene) => scene.id === edge.from);
  const from = doc.scenes[fromIndex];
  if (!from) return { reason: "节点不存在" };
  const base = `/scenes/${fromIndex}/flow`;

  if (edge.kind === "auto") return { ops: [{ op: "remove", path: `${base}/nextSceneId` }] };
  if (edge.kind === "settlement") return { ops: [{ op: "remove", path: `${base}/nextChapterNodeId` }] };

  if (from.flow.kind === "choice" && edge.kind === "choice") {
    const index = from.flow.choices.findIndex((choice) => choice.nextSceneId === edge.to);
    if (index < 0) return { reason: "选项不存在" };
    return { ops: [{ op: "remove", path: `${base}/choices/${index}/nextSceneId` }] };
  }

  if (from.flow.kind === "menu" && edge.kind === "menu") {
    const index = from.flow.items.findIndex((item) => item.action.sceneId === edge.to);
    if (index < 0) return { reason: "菜单项不存在" };
    return { ops: [{ op: "remove", path: `${base}/items/${index}` }] };
  }

  if (from.flow.kind === "qte") {
    const path = edge.kind === "qte-success" ? `${base}/qtes/0/onSuccess/nextSceneId` : `${base}/qtes/0/onFail/nextSceneId`;
    return { ops: [{ op: "remove", path }] };
  }

  return { reason: "这条边不能直接删除" };
}