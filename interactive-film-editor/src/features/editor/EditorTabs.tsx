"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { t } from "@/i18n/film-messages";
import { useEditor } from "./EditorProvider";

interface Tab {
  key: string;
  label: string;
  enabled: boolean;
}

const TABS: Tab[] = [
  { key: "graph", label: t("editor.tabs.graph"), enabled: true },
  { key: "scene", label: t("editor.tabs.scene"), enabled: true },
  { key: "nodes", label: t("editor.tabs.nodes"), enabled: true },
  { key: "chapters", label: t("editor.tabs.chapters"), enabled: true },
  { key: "variables", label: t("editor.tabs.variables"), enabled: true },
  { key: "assets", label: t("editor.tabs.assets"), enabled: true },
  { key: "preview", label: t("editor.tabs.preview"), enabled: true },
  { key: "settings", label: t("editor.tabs.settings"), enabled: true },
];

export function EditorTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const { doc } = useEditor();

  const hrefFor = (tab: Tab): string => {
    if (tab.key === "scene") return `/v2/project/${projectId}/scene/${doc.start.sceneId}`;
    return `/v2/project/${projectId}/${tab.key}`;
  };

  return (
    <nav className="ed-tabs-float">
      {TABS.map((tab) => {
        if (!tab.enabled) {
          return (
            <span key={tab.key} className="ed-tab ed-tab-off">
              {tab.label}
            </span>
          );
        }
        const active = pathname?.includes(`/${tab.key}`) ?? false;
        return (
          <Link key={tab.key} href={hrefFor(tab)} className={`ed-tab${active ? " ed-tab-active" : ""}`}>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}