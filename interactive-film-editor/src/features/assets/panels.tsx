"use client";

import type { ProjectAsset, ProjectDoc } from "@/domain/project/schema";
import { findAssetReferences } from "@/domain/project/references";
import { bucketFor, formatBytes } from "@/domain/project/assets";
import { AppIcon } from "@/components/ui/icons";

export const KIND_LABEL: Record<ProjectAsset["kind"], string> = {
  video: "视频",
  image: "图片",
  audio: "音频",
  lottie: "Lottie",
};

export const FILTERS = [
  { key: "all", label: "全部" },
  { key: "video", label: "视频" },
  { key: "image", label: "图片" },
  { key: "audio", label: "音频" },
  { key: "lottie", label: "Lottie" },
] as const;

export type AssetFilter = (typeof FILTERS)[number]["key"];

export function AssetActions({
  filter,
  onFilter,
  busy,
  onUpload,
}: {
  filter: AssetFilter;
  onFilter: (next: AssetFilter) => void;
  busy: boolean;
  onUpload: () => void;
}) {
  return (
    <>
      {FILTERS.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`film-btn${filter === item.key ? " film-btn-primary" : ""}`}
          onClick={() => onFilter(item.key)}
        >
          {item.label}
        </button>
      ))}
      <button type="button" className="film-btn" disabled={busy} onClick={onUpload}>
        {busy ? "处理中…" : "上传素材"}
      </button>
    </>
  );
}

function mediaUrl(src: string): string {
  return `/api/media/${src.split("/").pop()}`;
}

export function AssetCard({
  asset,
  active,
  usage,
  onSelect,
}: {
  asset: ProjectAsset;
  active: boolean;
  usage: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`pg-media-card${active ? " pg-media-card-active" : ""}`}
    >
      <span className="pg-media-thumb">
        {asset.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl(asset.src)} alt={asset.name} />
        ) : (
          <AppIcon name={asset.kind === "audio" ? "bolt" : "play"} size={22} />
        )}
      </span>
      <span className="pg-media-body">
        <span className="pg-media-name">{asset.name}</span>
        <span className="pg-media-meta">
          {KIND_LABEL[asset.kind]} · {formatBytes(asset.size)}
          {usage > 0 ? ` · ${usage} 处` : ""}
        </span>
      </span>
    </button>
  );
}

export function AssetDetail({
  asset,
  doc,
  onRemove,
}: {
  asset: ProjectAsset;
  doc: ProjectDoc;
  onRemove: () => void;
}) {
  return (
    <>
      <div className="film-h2">{asset.name}</div>
      <div className="film-label film-mono">{asset.id}</div>
      <div className="film-label">
        类型：{asset.kind}（{bucketFor(asset.kind)}）· mime：{asset.mime}
      </div>
      {asset.width ? (
        <div className="film-label">
          尺寸：{asset.width}×{asset.height}
        </div>
      ) : null}
      {asset.duration ? <div className="film-label">时长：{asset.duration.toFixed(2)}s</div> : null}
      <div className="film-label">体积：{formatBytes(asset.size)}</div>
      <div className="film-label film-mono">hash：{asset.hash ?? "—"}</div>
      <div className="film-label">引用：{findAssetReferences(doc, asset.id).length} 处</div>
      <div>
        <button type="button" className="film-btn film-btn-danger" onClick={onRemove}>
          删除素材
        </button>
      </div>
    </>
  );
}