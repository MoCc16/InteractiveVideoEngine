/** 面板换皮：project.panels 指向 layouts.shared 里的版式；没配就用内建面板 */
import type { ProjectDoc, ProjectLayout } from "@/domain/project/schema";

export const PANEL_KINDS = ["settings", "progress", "chapters"] as const;
export type PanelKind = (typeof PANEL_KINDS)[number];

export const PANEL_LABEL: Record<PanelKind, string> = {
  settings: "设置面板",
  progress: "进度面板",
  chapters: "节点选集面板",
};

export function resolvePanelLayout(doc: ProjectDoc, kind: PanelKind): ProjectLayout | null {
  const id = doc.panels?.[kind];
  if (!id) return null;
  return doc.layouts?.shared.find((layout) => layout.id === id) ?? null;
}