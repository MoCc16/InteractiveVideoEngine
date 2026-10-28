import { StageZoom } from "@/features/editor/StageZoom";
import { StoryGraphView } from "@/features/story-graph/StoryGraphView";
import { getProjectDoc } from "@/server/projects/read";

export const dynamic = "force-dynamic";

export default async function GraphPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await getProjectDoc(id);
  return (
    <div className="ed-stage">
      <StageZoom initial={0.8}>
        <StoryGraphView />
      </StageZoom>
    </div>
  );
}