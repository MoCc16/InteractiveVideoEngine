"use client";

import { useEditor } from "@/features/editor/EditorProvider";
import type { ProjectChapter } from "@/domain/project/schema";
import { PreconditionEditor } from "./PreconditionEditor";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="film-form-row-sm">
      <span className="film-label">{label}</span>
      <div>{children}</div>
    </div>
  );
}

/** 章节表单：基础字段 + 解锁前置条件 */
export function ChapterForm({ chapter }: { chapter: ProjectChapter }) {
  const { doc, apply } = useEditor();
  const index = doc.chapters.indexOf(chapter);
  const base = `/chapters/${index}`;
  const write = (key: string, value: unknown) => apply([{ op: "replace", path: `${base}/${key}`, value }]);
  const add = (key: string, value: unknown) => apply([{ op: "add", path: `${base}/${key}`, value }]);

  return (
    <div className="film-col-gap">
      <div>
        <div className="film-h2">{chapter.name || "（未命名章节）"}</div>
        <div className="film-label film-mono">{chapter.id}</div>
      </div>

      <Row label="章节名">
        <input className="film-input" defaultValue={chapter.name} onBlur={(event) => write("name", event.target.value)} />
      </Row>
      <Row label="章节序号">
        <input
          className="film-input"
          defaultValue={chapter.seqLabel ?? ""}
          placeholder="如 第一章"
          onBlur={(event) => add("seqLabel", event.target.value)}
        />
      </Row>
      <Row label="章节简介">
        <input className="film-input" defaultValue={chapter.summary ?? ""} onBlur={(event) => add("summary", event.target.value)} />
      </Row>
      <Row label="首节点">
        <select className="film-input" value={chapter.startNodeId ?? ""} onChange={(event) => add("startNodeId", event.target.value)}>
          <option value="">未指定</option>
          {doc.scenes.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.displayTitle || scene.title || scene.id}
            </option>
          ))}
        </select>
      </Row>
      <Row label="起始章">
        <input type="checkbox" checked={chapter.isFirst} onChange={(event) => write("isFirst", event.target.checked)} />
      </Row>
      <Row label="启用">
        <input type="checkbox" checked={chapter.enabled} onChange={(event) => write("enabled", event.target.checked)} />
      </Row>

      <PreconditionEditor doc={doc} chapter={chapter} base={base} apply={apply} />
    </div>
  );
}