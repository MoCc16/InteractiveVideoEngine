import { AppBrand, AppRail, AppTopBar } from "@/components/app-shell/AppShell";
import { AppIcon } from "@/components/ui/icons";
import { ProjectGrid } from "@/components/app-shell/ProjectGrid";
import { buildProjectPreview, type ProjectPreview } from "@/domain/project/preview";
import { getProjectService } from "@/server/projects/container";
import { t } from "@/i18n/film-messages";
import Link from "next/link";

export const dynamic = "force-dynamic";

/** 首页：品牌 + 主视觉输入框 + 最近项目（对齐目标产品布局） */
export default async function HomePage() {
  const service = getProjectService();
  const projects = await service.list("u_demo");
  const recent = projects.slice(0, 4);
  const previews: Record<string, ProjectPreview> = {};
  for (const project of recent) {
    const doc = await service.get(project.id);
    previews[project.id] = buildProjectPreview(doc);
  }

  return (
    <>
      <AppRail />
      <AppTopBar />
      <AppBrand />

      <main>
        <section className="app-hero">
          <h1 className="app-hero-title">开启你的互动影游之旅吧</h1>

          <div className="app-composer">
            <textarea
              className="app-composer-input"
              aria-label="创作需求"
              placeholder="描述一个悬疑故事，AI 会生成可编辑的剧本与分镜"
            />
            <div className="app-composer-row">
              <span className="app-chip">游戏编辑器 ▾</span>
              <button type="button" className="app-icon-btn" aria-label="上传素材">
                <AppIcon name="upload" size={16} />
              </button>
              <button type="button" className="app-send" aria-label="开始创作" disabled title="AI 生成未接入">
                <AppIcon name="send" size={16} />
              </button>
            </div>
          </div>
          <div className="app-hint">试试让 AI 写剧本，或直接粘贴已有剧本 · 回车换行，Ctrl / ⌘ + Enter 提交</div>
        </section>

        <section className="app-section">
          <div className="app-section-head">
            <span className="app-section-title">最近项目</span>
            <span className="app-section-sub">{t("projects.count", { count: projects.length })}</span>
            <span className="app-section-actions">
              <button type="button" className="app-chip" disabled title="导入未接入">
                导入项目
              </button>
              <Link href="/projects" className="app-chip">
                更多项目
              </Link>
            </span>
          </div>

          {recent.length === 0 ? (
            <p className="app-empty">还没有项目，点「新建项目」开始</p>
          ) : (
            <ProjectGrid projects={recent} previews={previews} />
          )}
          <p className="app-hint">没有更多项目了</p>
        </section>
      </main>
    </>
  );
}