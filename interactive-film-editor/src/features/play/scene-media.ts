import type { ProjectDoc, ProjectAsset, Scene } from "@/domain/project/schema";

export interface SceneMedia {
  asset: ProjectAsset | undefined;
  src: string | undefined;
  loop: boolean;
  label: string;
}

/** 场景绑定的视频：解析素材、网关地址、是否循环、状态栏文案 */
export function resolveSceneMedia(doc: ProjectDoc, scene: Scene | undefined): SceneMedia {
  const assetId = scene?.video?.assetId;
  const asset = assetId ? doc.assets?.videos?.[assetId] : undefined;
  const file = asset?.src?.split("/").pop();
  const loop = scene?.flow.kind === "choice" ? (scene.video?.loop ?? true) : false;
  const label = asset ? `视频 ${asset.duration ? `${asset.duration.toFixed(1)}s` : "时长未知"}` : "无视频";
  return { asset, src: file ? `/api/media/${file}` : undefined, loop, label };
}