/**
 * 素材引用扫描：删除前必须知道"有没有人用"（目标产品用 409 + references 拒绝删除）。
 * 这里给出纯函数实现，供 API 与 UI 共用。
 */
import type { Component, ProjectDoc } from "@/domain/project/schema";

export interface AssetReference {
  /** JSON Pointer 风格路径，便于直接定位 */
  path: string;
  label: string;
}

function scanComponent(component: Component, path: string, assetId: string, out: AssetReference[]) {
  const content = component.content as { kind?: string; value?: unknown; expr?: string } | undefined;
  if (content) {
    if (content.kind === "literal" && content.value === assetId) {
      out.push({ path: `${path}/content`, label: `元件内容 · ${component.id}` });
    }
    if (content.kind === "binding" && typeof content.expr === "string" && content.expr.includes(assetId)) {
      out.push({ path: `${path}/content`, label: `元件绑定 · ${component.id}` });
    }
  }
  const style = component.style as Record<string, unknown> | undefined;
  for (const [key, raw] of Object.entries(style ?? {})) {
    const value =
      raw && typeof raw === "object" ? ((raw as { value?: unknown }).value ?? (raw as { expr?: string }).expr) : raw;
    if (typeof value === "string" && value.includes(assetId)) {
      out.push({ path: `${path}/style/${key}`, label: `元件样式 · ${component.id}` });
    }
  }
  (component.children ?? []).forEach((child, index) =>
    scanComponent(child, `${path}/children/${index}`, assetId, out),
  );
}

export function findAssetReferences(doc: ProjectDoc, assetId: string): AssetReference[] {
  const out: AssetReference[] = [];

  if (doc.splash?.bgImageAssetId === assetId) out.push({ path: "/splash/bgImageAssetId", label: "开场主界面背景" });
  if (doc.audio?.bgmAssetId === assetId) out.push({ path: "/audio/bgmAssetId", label: "背景音乐" });

  doc.chapters.forEach((chapter, index) => {
    if (chapter.coverAssetId === assetId) out.push({ path: `/chapters/${index}/coverAssetId`, label: `章节封面 · ${chapter.name}` });
  });

  doc.scenes.forEach((scene, index) => {
    if (scene.video?.assetId === assetId) out.push({ path: `/scenes/${index}/video/assetId`, label: `节点视频 · ${scene.title || scene.id}` });
    if (scene.posterAssetId === assetId) out.push({ path: `/scenes/${index}/posterAssetId`, label: `节点预览图 · ${scene.title || scene.id}` });
  });

  (doc.layouts?.shared ?? []).forEach((layout, index) =>
    scanComponent(layout.root, `/layouts/shared/${index}/root`, assetId, out),
  );

  (doc.components ?? []).forEach((_item, index) => {
    const serialized = JSON.stringify(doc.components?.[index]);
    if (serialized?.includes(assetId)) out.push({ path: `/components/${index}`, label: "项目级元件" });
  });

  return out;
}

/** 素材使用次数（列表里显示「N 处使用 / 未使用」） */
export function countAssetUsage(doc: ProjectDoc, assetId: string): number {
  return findAssetReferences(doc, assetId).length;
}
