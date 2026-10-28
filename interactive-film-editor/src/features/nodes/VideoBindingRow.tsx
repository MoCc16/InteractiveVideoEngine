"use client";

import type { JsonPatchOp } from "@/domain/project/patch";
import type { ProjectDoc, Scene } from "@/domain/project/schema";
import { Row } from "./NodeFlowEditors";

/** 节点绑定视频（来自资源库），绑定即写入 /scenes/<i>/video */
export function VideoBindingRow({
  doc,
  scene,
  index,
  apply,
}: {
  doc: ProjectDoc;
  scene: Scene;
  index: number;
  apply: (ops: JsonPatchOp[]) => void;
}) {
  const videos = Object.values(doc.assets?.videos ?? {});
  const bound = scene.video?.assetId ? doc.assets?.videos?.[scene.video.assetId] : undefined;

  const onChange = (assetId: string) => {
    if (!assetId) {
      apply([{ op: "remove", path: `/scenes/${index}/video` }]);
      return;
    }
    const asset = doc.assets?.videos?.[assetId];
    apply([
      {
        op: "add",
        path: `/scenes/${index}/video`,
        value: {
          assetId,
          duration: Math.max(asset?.duration ?? 0, 0.1),
          loop: scene.flow.kind === "choice",
        },
      },
    ]);
  };

  return (
    <Row label="视频">
      <div className="film-block">
        <select className="film-input" value={scene.video?.assetId ?? ""} onChange={(event) => onChange(event.target.value)}>
          <option value="">未绑定</option>
          {videos.map((video) => (
            <option key={video.id} value={video.id}>
              {video.name}
              {video.duration ? ` · ${video.duration.toFixed(1)}s` : ""}
            </option>
          ))}
        </select>
        <div className="film-label">
          {bound
            ? `${bound.mime} · ${bound.width ?? "?"}×${bound.height ?? "?"} · ${
                bound.duration ? bound.duration.toFixed(2) + "s" : "时长未知"
              }`
            : "从资源库绑定视频后，试玩会播放真实视频"}
        </div>
      </div>
    </Row>
  );
}