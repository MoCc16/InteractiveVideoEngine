"use client";

import { useState } from "react";
import { useEditor } from "@/features/editor/EditorProvider";
import type { ProjectAsset } from "@/domain/project/schema";
import { formatBytes } from "@/domain/project/assets";
import { findAssetReferences } from "@/domain/project/references";
import { PageHeader } from "@/components/ui/PageHeader";
import { AssetActions, AssetCard, AssetDetail, type AssetFilter } from "./panels";
import { useAssetActions } from "./use-assets";

/** 资源页：筛选 + 上传 + 素材卡片网格 + 右侧详情 */
export function AssetsEditor({ projectId }: { projectId: string }) {
  const { doc } = useEditor();
  const [filter, setFilter] = useState<AssetFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { busy, message, upload, remove, fileInput } = useAssetActions(projectId, doc);

  const assets: ProjectAsset[] = [
    ...Object.values(doc.assets?.videos ?? {}),
    ...Object.values(doc.assets?.images ?? {}),
    ...Object.values(doc.assets?.audio ?? {}),
    ...Object.values(doc.assets?.lotties ?? {}),
  ];
  const visible = assets.filter((asset) => filter === "all" || asset.kind === filter);
  const selected = assets.find((asset) => asset.id === selectedId) ?? null;
  const totalBytes = assets.reduce((sum, asset) => sum + (asset.size ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="资源"
        subtitle={`${assets.length} 项 · ${formatBytes(totalBytes)}`}
        actions={<AssetActions filter={filter} onFilter={setFilter} busy={busy} onUpload={() => fileInput.current?.click()} />}
      />

      <input
        ref={fileInput}
        type="file"
        hidden
        accept="video/mp4,image/png,image/jpeg,image/webp,audio/mpeg,audio/wav,application/json"
        onChange={(event) => void upload(event.target.files)}
      />

      {message ? <div className="film-label film-accent">{message}</div> : null}

      <div className="pg-layout-reverse">
        <div>
          {visible.length === 0 ? (
            <div className="pg-empty">还没有素材，点右上「上传素材」</div>
          ) : (
            <div className="pg-media-grid">
              {visible.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  active={asset.id === selectedId}
                  usage={findAssetReferences(doc, asset.id).length}
                  onSelect={() => setSelectedId(asset.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="pg-panel">
          {selected ? (
            <AssetDetail
              asset={selected}
              doc={doc}
              onRemove={() => {
                void remove(selected).then((ok) => {
                  if (ok) setSelectedId(null);
                });
              }}
            />
          ) : (
            <div className="pg-empty">点击素材查看元信息</div>
          )}
        </div>
      </div>
    </div>
  );
}