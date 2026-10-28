import { PlayRuntime } from "@/features/play/PlayRuntime";
import { getProjectDoc } from "@/server/projects/read";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getProjectDoc(id);
  return <PlayRuntime projectId={id} doc={doc} />;
}