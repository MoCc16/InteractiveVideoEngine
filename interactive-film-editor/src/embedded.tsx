/**
 * 迁移入口：morph 侧只需要渲染 <FilmEditorApp projectId="..." />。
 * 现在直接复用 app 路由的编辑器外壳；迁移到 packages/ 后把它换成内嵌版本即可。
 */
import { EditorProvider } from "@/features/editor/EditorProvider";
import { EditorShell } from "@/features/editor/EditorShell";
import type { ProjectDoc } from "@/domain/project/schema";

export function FilmEditorApp({
  projectId,
  doc,
  revision = 0,
  children,
}: {
  projectId: string;
  doc: ProjectDoc;
  revision?: number;
  children?: React.ReactNode;
}) {
  return (
    <EditorProvider projectId={projectId} initialDoc={doc} initialRevision={revision}>
      <EditorShell projectId={projectId} />
      <main>{children}</main>
    </EditorProvider>
  );
}