import { SettingsEditor } from "@/features/settings/SettingsEditor";
import { getProjectDoc } from "@/server/projects/read";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getProjectDoc(id);
  return (
    <div className="ed-stage">
      <SettingsEditor />
    </div>
  );
}