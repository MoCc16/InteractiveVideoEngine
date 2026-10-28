"use client";

import { useEffect } from "react";
import { useEditor } from "./EditorProvider";


/** 编辑器通用快捷键：撤销 / 重做 / 保存 */
export function useEditorShortcuts() {
  const { undo, redo, save, canUndo, canRedo } = useEditor();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
        return;
      }
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          if (canRedo) redo();
        } else if (canUndo) undo();
        return;
      }
      if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        if (canRedo) redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, save, canUndo, canRedo]);
}