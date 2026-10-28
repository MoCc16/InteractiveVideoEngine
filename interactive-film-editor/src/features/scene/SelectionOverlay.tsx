"use client";

import type { CSSProperties } from "react";
import type { Box } from "@/domain/project/anchor";
import type { Corner } from "./drag";

const CORNERS: Corner[] = ["tl", "tr", "bl", "br"];

/** 选中框：四角缩放把手（画布坐标系，随 scale 反向补偿，保证屏幕上大小一致） */
export function SelectionOverlay({
  box,
  scale,
  onBegin,
}: {
  box: Box;
  scale: number;
  onBegin: (event: React.PointerEvent<HTMLSpanElement>, corner: Corner) => void;
}) {
  const size = 8 / scale;
  const half = size / 2;
  const positions: Record<Corner, { x: number; y: number }> = {
    tl: { x: box.x - half, y: box.y - half },
    tr: { x: box.x + box.width - half, y: box.y - half },
    bl: { x: box.x - half, y: box.y + box.height - half },
    br: { x: box.x + box.width - half, y: box.y + box.height - half },
  };
  return (
    <>
      {CORNERS.map((corner) => (
        <span
          key={corner}
          role="presentation"
          className="film-handle"
          style={{ "--hx": positions[corner].x, "--hy": positions[corner].y, "--hs": size } as CSSProperties}
          onPointerDown={(event) => onBegin(event, corner)}
        />
      ))}
    </>
  );
}