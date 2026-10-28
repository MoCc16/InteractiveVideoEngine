/** 素材的纯展示工具（客户端与服务端共用，不能依赖 node:fs） */
import type { ProjectAsset } from "@/domain/project/schema";

export function bucketFor(kind: ProjectAsset["kind"]): "videos" | "images" | "audio" | "lotties" {
  if (kind === "video") return "videos";
  if (kind === "image") return "images";
  if (kind === "audio") return "audio";
  return "lotties";
}

export function formatBytes(size: number | undefined): string {
  if (!size) return "—";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}