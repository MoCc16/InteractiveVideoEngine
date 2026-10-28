import { AppRail, AppTopBar } from "@/components/app-shell/AppShell";
import { ProjectGrid } from "@/components/app-shell/ProjectGrid";
import { buildProjectPreview, type ProjectPreview } from "@/domain/project/preview";
import { getProjectService } from "@/server/projects/container";
import { t } from "@/i18n/film-messages";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const service = getProjectService();
  const projects = await service.list("u_demo");
  const previews: Record<string, ProjectPreview> = {};
  for (const project of projects) {
    const doc = await service.get(project.id);
    previews[project.id] = buildProjectPreview(doc);
  }

  return (
    <>
      <AppRail />
      <AppTopBar />
      <main className="app-section">
        <div className="app-section-head">
          <span className="app-section-title">{t("projects.title")}</span>
          <span className="app-section-sub">{t("projects.count", { count: projects.length })}</span>
          <span className="app-section-actions">
            <button type="button" className="app-chip" disabled title="导入未接入">
              导入项目
            </button>
          </span>
        </div>

        {projects.length === 0 ? (
          <p className="app-empty">还没有项目</p>
        ) : (
          <ProjectGrid projects={projects} previews={previews} showNew={false} />
        )}
      </main>
    </>
  );
}
