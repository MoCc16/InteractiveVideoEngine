import { SceneEditor } from "@/features/scene/SceneEditor";
import { getProjectDoc } from "@/server/projects/read";

export const dynamic = "force-dynamic";

export default async function ScenePage({ params }: { params: Promise<{ id: string; sceneId: string }> }) {
  const { id, sceneId } = await params;
  const doc = await getProjectDoc(id);
  const target = doc.scenes.find((scene) => scene.id === sceneId) ?? doc.scenes[0];
  return (
    <SceneEditor sceneId={target?.id ?? ""} />
  );
}
