"use client";

import type { ProjectDoc } from "@/domain/project/schema";
import { buildStyleContext } from "@/domain/project/style";
import { PANEL_LABEL, resolvePanelLayout, type PanelKind } from "@/domain/project/panels";
import { LayoutView } from "./PlayStage";

/**
 * 换皮面板：用 project.panels 指向的版式做浮层（不跳场景、不打断视频）。
 * 版式里的 panelCloseButton 元件或 action=closePanel 的按钮会关闭面板。
 */
export function PanelOverlay({
  kind,
  doc,
  onClose,
}: {
  kind: PanelKind;
  doc: ProjectDoc;
  onClose: () => void;
}) {
  const layout = resolvePanelLayout(doc, kind);
  if (!layout) return null;
  const ctx = buildStyleContext(doc);
  const hasClose = JSON.stringify(layout.root).includes("panelCloseButton");
  const stageVars = {
    "--cw": doc.canvas.width,
    "--ch": doc.canvas.height,
    "--scale": 0.42,
  } as React.CSSProperties;

  return (
    <div className="film-panel-overlay">
      <div className="film-panel-overlay-backdrop" onClick={onClose} role="presentation" />
      <div className="film-panel-overlay-card">
        <div className="film-panel-overlay-head">
          <span className="film-section-title">{PANEL_LABEL[kind]}</span>
          <button type="button" className="film-btn film-btn-sm" onClick={onClose}>
            关闭
          </button>
        </div>
        <div className="film-panel-overlay-stage" style={stageVars}>
          <LayoutView layout={layout} ctx={ctx} width={doc.canvas.width} height={doc.canvas.height} />
        </div>
        {hasClose ? <div className="film-label">该面板自带关闭元件，点面板内的 ✕ 也可关闭</div> : null}
      </div>
    </div>
  );
}
