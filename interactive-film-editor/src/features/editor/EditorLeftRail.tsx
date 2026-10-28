"use client";

import { AppIcon } from "@/components/ui/icons";
import { useEditor } from "./EditorProvider";

/** 左侧浮动工具条：新增节点 / 撤销（搜索暂不可用） */
export function EditorLeftRail() {
  const { undo, canUndo } = useEditor();

  return (
    <div className="ed-rail" role="toolbar" aria-label="编辑工具">
      <button type="button" className="ed-rail-btn ed-rail-btn-primary" aria-label="新增节点" title="新增节点（在节点页操作）">
        <AppIcon name="plus" size={16} />
      </button>
      <button type="button" className="ed-rail-btn" aria-label="搜索" title="搜索未接入">
        <AppIcon name="search" size={16} />
      </button>
      <button type="button" className="ed-rail-btn" aria-label="撤销" disabled={!canUndo} onClick={undo}>
        <AppIcon name="undo" size={16} />
      </button>
    </div>
  );
}