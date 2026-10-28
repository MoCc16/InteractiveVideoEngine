import { ChaptersEditor } from "@/features/chapters/ChaptersEditor";
import { getProjectDoc } from "@/server/projects/read";

export const dynamic = "force-dynamic";

export default async function ChaptersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getProjectDoc(id);
  return (
    <div className="ed-stage">
      <ChaptersEditor />
    </div>
  );
}