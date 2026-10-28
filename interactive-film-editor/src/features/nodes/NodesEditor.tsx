"use client";

import { useState } from "react";
import { useEditor } from "@/features/editor/EditorProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import type { Scene } from "@/domain/project/schema";
import { NodeForm } from "./NodeForm";

const FLOW_LABEL: Record<Scene["flow"]["kind"], string> = {
  auto: "播放",
  choice: "选择",
  qte: "QTE",
  ending: "结局",
  menu: "菜单",
  settlement: "结算",
};

type KindFilter = "all" | Scene["flow"]["kind"];

const FILTERS: Array<{ key: KindFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "auto", label: "播放" },
  { key: "choice", label: "选择" },
  { key: "qte", label: "QTE" },
  { key: "menu", label: "菜单" },
  { key: "ending", label: "结局" },
  { key: "settlement", label: "结算" },
];

/** 节点页：左侧节点卡片 + 右侧表单面板 */
export function NodesEditor({ initialSceneId }: { initialSceneId?: string }) {
  const { doc } = useEditor();
  const [filter, setFilter] = useState<KindFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(initialSceneId ?? doc.scenes[0]?.id ?? null);

  const scenes = doc.scenes.filter((scene) => filter === "all" || scene.flow.kind === filter);
  const selected = doc.scenes.find((scene) => scene.id === selectedId) ?? scenes[0] ?? null;

  return (
    <div>
      <PageHeader
        title="节点"
        subtitle={`${doc.scenes.length} 个节点 · 当前 ${scenes.length} 个可见`}
        actions={
          <div className="film-row-gap film-wrap">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`film-btn${filter === item.key ? " film-btn-primary" : ""}`}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="pg-layout">
        <div className="pg-list">
          {scenes.map((scene) => {
            const active = scene.id === selected?.id;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => setSelectedId(scene.id)}
                className={`pg-card${active ? " pg-card-active" : ""}`}
              >
                <span className="pg-card-top">
                  <span className="pg-chip">{FLOW_LABEL[scene.flow.kind]}</span>
                  {scene.isStart ? <span className="pg-chip pg-chip-muted">START</span> : null}
                  {scene.isEnding ? <span className="pg-chip pg-chip-muted">结局</span> : null}
                  {scene.video?.assetId ? null : <span className="pg-chip pg-chip-muted">无视频</span>}
                </span>
                <span className="pg-card-title">{scene.displayTitle || scene.title || "（无标题）"}</span>
                <span className="pg-card-meta">{scene.id}</span>
              </button>
            );
          })}
        </div>

        <div className="pg-panel">
          {selected ? <NodeForm scene={selected} /> : <div className="pg-empty">没有节点</div>}
        </div>
      </div>
    </div>
  );
}