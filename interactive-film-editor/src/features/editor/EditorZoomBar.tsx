"use client";

import { useEffect, useState } from "react";
import { AppIcon } from "@/components/ui/icons";
import { zoomStore } from "./zoom-store";

/** 底部缩放条：− / 百分比 / + / 适应画布 */
export function EditorZoomBar() {
  const [zoom, setZoom] = useState(1);

  useEffect(() => zoomStore.subscribe(setZoom), []);

  const step = (delta: number) => zoomStore.set(zoomStore.get() + delta);

  return (
    <div className="ed-zoom" role="toolbar" aria-label="画布缩放">
      <button type="button" className="ed-zoom-btn" aria-label="缩小" onClick={() => step(-0.06)}>
        −
      </button>
      <span className="ed-zoom-btn ed-zoom-pct">{Math.round(zoom * 100)}%</span>
      <button type="button" className="ed-zoom-btn" aria-label="放大" onClick={() => step(0.06)}>
        +
      </button>
      <span className="ed-zoom-sep" />
      <button type="button" className="ed-zoom-btn" aria-label="适应画布" onClick={() => zoomStore.set(0.42)}>
        <AppIcon name="film" size={15} />
      </button>
      <button type="button" className="ed-zoom-btn" aria-label="重置" onClick={() => zoomStore.set(1)}>
        1:1
      </button>
    </div>
  );
}