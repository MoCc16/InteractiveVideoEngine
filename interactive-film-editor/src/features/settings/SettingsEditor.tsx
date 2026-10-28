"use client";

import { useEditor } from "@/features/editor/EditorProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { CanvasSection, ExportSection, PanelSection, SplashSection, ThemeSection } from "./sections";

/** 项目设置：两列卡片（开场 / 配色 / 画布 / 播放器面板 / 导出报价） */
export function SettingsEditor() {
  const { doc, apply } = useEditor();

  return (
    <div>
      <PageHeader title="项目设置" subtitle="开场界面 · 配色 · 画布 · 播放器面板 · 导出报价" />
      <div className="pg-grid-2">
        <SplashSection doc={doc} apply={apply} />
        <ThemeSection doc={doc} apply={apply} />
        <CanvasSection doc={doc} apply={apply} />
        <PanelSection doc={doc} apply={apply} />
        <ExportSection doc={doc} />
      </div>
    </div>
  );
}