"use client";

import { EditorHeader } from "./EditorHeader";
import { EditorLeftRail } from "./EditorLeftRail";
import { EditorTabs } from "./EditorTabs";
import { EditorZoomBar } from "./EditorZoomBar";
import { useEditorShortcuts } from "./use-editor-shortcuts";

/** 编辑器外壳：悬浮顶栏 + 居中胶囊页签 + 左工具条 + 底部缩放条 + 全局快捷键 */
export function EditorShell({ projectId }: { projectId: string }) {
  useEditorShortcuts();
  return (
    <div className="ed-shell">
      <EditorHeader />
      <EditorTabs projectId={projectId} />
      <EditorLeftRail />
      <EditorZoomBar />
    </div>
  );
}