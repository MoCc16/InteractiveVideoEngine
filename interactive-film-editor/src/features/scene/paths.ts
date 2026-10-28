/**
 * 按 JSON Pointer 解析版式里的元件（属性面板需要"当前值"，不能用点选时的快照）。
 * 只支持本项目用到的路径形态：/layouts/shared/<i>/root/children/<j>/...
 */
import type { Component, ProjectDoc } from "@/domain/project/schema";

export function resolveComponentAtPath(doc: ProjectDoc, path: string | null): Component | null {
  if (!path) return null;
  const tokens = path.split("/").filter(Boolean);
  if (tokens[0] !== "layouts" || tokens[1] !== "shared") return null;
  const layoutIndex = Number(tokens[2]);
  const layout = doc.layouts?.shared[layoutIndex];
  if (!layout) return null;

  if (tokens[3] !== "root") return null;
  let cursor: Component | undefined = layout.root;
  let index = 4;
  while (index < tokens.length) {
    const token = tokens[index];
    if (token !== "children") return null;
    const childIndex = Number(tokens[index + 1]);
    cursor = cursor?.children?.[childIndex];
    if (!cursor) return null;
    index += 2;
  }
  return cursor ?? null;
}
