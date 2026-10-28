import { VariablesEditor } from "@/features/variables/VariablesEditor";
import { getProjectDoc } from "@/server/projects/read";

export const dynamic = "force-dynamic";

export default async function VariablesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getProjectDoc(id);
  return (
    <div className="ed-stage">
      <VariablesEditor />
    </div>
  );
}