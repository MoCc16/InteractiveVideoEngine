import { NodesEditor } from "@/features/nodes/NodesEditor";
import { getProjectDoc } from "@/server/projects/read";

export const dynamic = "force-dynamic";

export default async function NodesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await getProjectDoc(id);
  return (
    <div className="ed-stage">
      <NodesEditor initialSceneId={doc.start.sceneId} />
    </div>
  );
}