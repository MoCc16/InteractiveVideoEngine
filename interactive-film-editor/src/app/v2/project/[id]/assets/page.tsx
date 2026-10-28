import { AssetsEditor } from "@/features/assets/AssetsEditor";
import { getProjectDoc } from "@/server/projects/read";

export const dynamic = "force-dynamic";

export default async function AssetsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getProjectDoc(id);
  return (
    <div className="ed-stage">
      <AssetsEditor projectId={id} />
    </div>
  );
}