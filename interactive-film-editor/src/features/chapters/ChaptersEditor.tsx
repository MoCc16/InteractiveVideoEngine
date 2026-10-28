"use client";

import { useState } from "react";
import { useEditor } from "@/features/editor/EditorProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChapterForm } from "./ChapterForm";

/** 章节页：左侧章节卡片 + 右侧表单面板 */
export function ChaptersEditor() {
  const { doc, apply } = useEditor();
  const [selectedId, setSelectedId] = useState<string | null>(doc.chapters[0]?.id ?? null);
  const selected = doc.chapters.find((chapter) => chapter.id === selectedId) ?? doc.chapters[0] ?? null;

  const addChapter = () => {
    const id = `chapter_${Math.random().toString(36).slice(2, 10)}`;
    apply([
      {
        op: "add",
        path: "/chapters/-",
        value: { id, name: `第${doc.chapters.length + 1}章`, isFirst: doc.chapters.length === 0, enabled: true },
      },
    ]);
    setSelectedId(id);
  };

  return (
    <div>
      <PageHeader
        title="章节"
        subtitle={`${doc.chapters.length} 章`}
        actions={
          <button type="button" className="film-btn film-btn-primary" onClick={addChapter}>
            新建章节
          </button>
        }
      />

      <div className="pg-layout">
        <div className="pg-list">
          {doc.chapters.map((chapter, index) => {
            const active = chapter.id === selected?.id;
            return (
              <button
                key={chapter.id}
                type="button"
                onClick={() => setSelectedId(chapter.id)}
                className={`pg-card${active ? " pg-card-active" : ""}`}
              >
                <span className="pg-card-top">
                  <span className="pg-chip">{String(index + 1).padStart(2, "0")}</span>
                  {chapter.isFirst ? <span className="pg-chip pg-chip-muted">起始章</span> : null}
                  {chapter.enabled ? null : <span className="pg-chip pg-chip-muted">停用</span>}
                </span>
                <span className="pg-card-title">{chapter.name}</span>
                <span className="pg-card-meta">{chapter.startNodeId ?? "未指定首节点"}</span>
              </button>
            );
          })}
        </div>

        <div className="pg-panel">
          {selected ? (
            <>
              <ChapterForm chapter={selected} />
              <div>
                <button
                  type="button"
                  className="film-btn film-btn-danger"
                  onClick={() => {
                    const index = doc.chapters.indexOf(selected);
                    if (index >= 0) apply([{ op: "remove", path: `/chapters/${index}` }]);
                    setSelectedId(null);
                  }}
                >
                  删除本章
                </button>
              </div>
            </>
          ) : (
            <div className="pg-empty">还没有章节，点「新建章节」开始</div>
          )}
        </div>
      </div>
    </div>
  );
}