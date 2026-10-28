"use client";

import { useRef, useState } from "react";
import type { ProjectAsset, ProjectDoc } from "@/domain/project/schema";
import { findAssetReferences } from "@/domain/project/references";

function reloadLater() {
  setTimeout(() => window.location.reload(), 700);
}

/** 素材上传/删除：处理 busy、提示文案与错误分支 */
export function useAssetActions(projectId: string, doc: ProjectDoc) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setMessage(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const response = await fetch(`/api/projects/${projectId}/assets`, { method: "POST", body: form });
      const payload = (await response.json().catch(() => null)) as { message?: string; asset?: ProjectAsset } | null;
      if (!response.ok) {
        setMessage(payload?.message ?? `上传失败（HTTP ${response.status}）`);
        return;
      }
      setMessage(`已上传 ${payload?.asset?.name ?? file.name}，正在刷新…`);
      reloadLater();
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const remove = async (asset: ProjectAsset): Promise<boolean> => {
    const references = findAssetReferences(doc, asset.id);
    if (references.length > 0) {
      setMessage(`仍被 ${references.length} 处引用：${references.map((item) => item.label).join("、")}`);
      return false;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/assets?assetId=${encodeURIComponent(asset.id)}`, {
        method: "DELETE",
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; references?: Array<{ label: string }> }
        | null;
      if (!response.ok) {
        setMessage(
          payload?.references
            ? `仍被引用：${payload.references.map((item) => item.label).join("、")}`
            : payload?.message ?? "删除失败",
        );
        return false;
      }
      setMessage(`已删除 ${asset.name}，正在刷新…`);
      reloadLater();
      return true;
    } finally {
      setBusy(false);
    }
  };

  return { busy, message, upload, remove, fileInput };
}