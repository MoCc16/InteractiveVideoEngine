import type { ProjectDoc, ProjectLayout } from "@/domain/project/schema";
import type { ThemeTokens } from "./style";
import { readThemeTokens } from "./style";

/** 项目卡缩略图需要的**最小**数据（不要把整份 doc 传到客户端） */
export interface ProjectPreview {
  width: number;
  height: number;
  layout: ProjectLayout | null;
  theme: ThemeTokens;
}

export function buildProjectPreview(doc: ProjectDoc): ProjectPreview {
  const startScene = doc.scenes.find((scene) => scene.id === doc.start.sceneId) ?? doc.scenes[0];
  const layoutId = startScene?.layoutId;
  const layout =
    doc.layouts?.shared.find((item) => item.id === layoutId) ?? doc.layouts?.shared[0] ?? null;
  return {
    width: doc.canvas.width,
    height: doc.canvas.height,
    layout,
    theme: readThemeTokens(doc),
  };
}