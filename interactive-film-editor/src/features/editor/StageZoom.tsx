"use client";

import type { CSSProperties, ReactNode } from "react";
import { useStageZoom } from "./zoom-store";

/** 把页面主体按底部缩放条的比例缩放（故事图/预览这类整块画布） */
export function StageZoom({ initial, children }: { initial: number; children: ReactNode }) {
  const zoom = useStageZoom(initial);
  return (
    <div className="ed-stage-zoomed" style={{ "--zoom": zoom } as CSSProperties}>
      {children}
    </div>
  );
}