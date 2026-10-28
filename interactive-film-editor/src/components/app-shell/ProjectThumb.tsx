"use client";

import type { CSSProperties } from "react";
import type { ProjectPreview } from "@/domain/project/preview";
import type { StyleContext } from "@/domain/project/style";
import { LayoutView } from "@/features/play/PlayStage";

const THUMB_WIDTH = 216;
const THUMB_SCALE = THUMB_WIDTH / 1920;

function contextOf(preview: ProjectPreview): StyleContext {
  return { theme: preview.theme, fields: {}, vars: {} };
}

/** 项目卡缩略图：把该项目的版式按 216 宽缩放渲染（真内容，不是占位图） */
export function ProjectThumb({ preview }: { preview: ProjectPreview }) {
  if (!preview.layout) return <div className="app-thumb app-thumb-empty" />;
  const vars = { "--thumb-scale": THUMB_SCALE } as CSSProperties;
  return (
    <div className="app-thumb app-thumb-live">
      <div className="app-thumb-stage" style={vars}>
        <LayoutView
          layout={preview.layout}
          ctx={contextOf(preview)}
          width={preview.width}
          height={preview.height}
        />
      </div>
    </div>
  );
}