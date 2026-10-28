"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { JsonPatchOp } from "@/domain/project/patch";
import type { ProjectDoc } from "@/domain/project/schema";
import {
  createPatchSession,
  dispatch,
  markError,
  markSaved,
  markSaving,
  pendingOps,
  redo,
  undo,
  type PatchSession,
} from "./patch-session";

export interface EditorApi {
  doc: ProjectDoc;
  revision: number;
  status: PatchSession["status"];
  error?: string;
  canUndo: boolean;
  canRedo: boolean;
  apply: (ops: JsonPatchOp[]) => void;
  undo: () => void;
  redo: () => void;
  save: () => Promise<void>;
  dirtyCount: number;
}

const EditorContext = createContext<EditorApi | null>(null);

export function EditorProvider({
  projectId,
  initialDoc,
  initialRevision,
  children,
}: {
  projectId: string;
  initialDoc: ProjectDoc;
  initialRevision: number;
  children: ReactNode;
}) {
  const [session, setSession] = useState<PatchSession>(() => createPatchSession(initialDoc, initialRevision));

  const apply = useCallback((ops: JsonPatchOp[]) => {
    setSession((current) => dispatch(current, ops));
  }, []);

  const undoAction = useCallback(() => setSession((current) => undo(current)), []);
  const redoAction = useCallback(() => setSession((current) => redo(current)), []);

  const save = useCallback(async () => {
    const ops = pendingOps(session);
    if (ops.length === 0) return;
    setSession((current) => markSaving(current));
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ baseRevision: session.revision, ops }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { project: ProjectDoc; revision: number }
        | { message?: string };
      if (!response.ok || !("project" in payload)) {
        const message = "message" in payload && payload.message ? payload.message : `保存失败（HTTP ${response.status}）`;
        setSession((current) => markError(current, message));
        return;
      }
      setSession((current) => markSaved(current, payload.project, payload.revision));
    } catch {
      setSession((current) => markError(current, "网络错误，保存失败"));
    }
  }, [projectId, session]);

  const value = useMemo<EditorApi>(
    () => ({
      doc: session.doc,
      revision: session.revision,
      status: session.status,
      error: session.lastError,
      canUndo: session.undoStack.length > 0,
      canRedo: session.redoStack.length > 0,
      apply,
      undo: undoAction,
      redo: redoAction,
      save,
      dirtyCount: pendingOps(session).length,
    }),
    [session, apply, undoAction, redoAction, save],
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorApi {
  const value = useContext(EditorContext);
  if (!value) throw new Error("useEditor 必须在 EditorProvider 内使用");
  return value;
}
