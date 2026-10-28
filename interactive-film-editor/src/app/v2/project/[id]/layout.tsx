import type { ReactNode } from "react";
import { EditorProvider } from "@/features/editor/EditorProvider";
import { EditorShell } from "@/features/editor/EditorShell";
import { getProjectDoc } from "@/server/projects/read";

export const dynamic = "force-dynamic";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getProjectDoc(id);

  return (
    <EditorProvider projectId={id} initialDoc={doc} initialRevision={0}>
      <EditorShell projectId={id} />
      <main>{children}</main>
    </EditorProvider>
  );
}
