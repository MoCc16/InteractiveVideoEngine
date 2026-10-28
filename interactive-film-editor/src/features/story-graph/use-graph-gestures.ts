"use client";

import { useEffect, useRef, useState } from "react";
import { zoomStore } from "@/features/editor/zoom-store";
import type { Point } from "./NodeCard";
import type { GraphNode } from "./layout";

/** 故事图手势：拖节点 / 拖空白平移 / Ctrl+滚轮缩放 / 连线模式按 Esc 取消 */
export function useGraphGestures() {
  const [moved, setMoved] = useState<Record<string, Point>>({});
  const [dragId, setDragId] = useState<string | null>(null);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [linkFrom, setLinkFrom] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  useEffect(() => {
    if (!linkFrom) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLinkFrom(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [linkFrom]);

  const positionOf = (node: GraphNode): Point => moved[node.id] ?? { x: node.x, y: node.y };

  const onNodeDown = (event: React.PointerEvent<HTMLDivElement>, node: GraphNode) => {
    if (linkFrom) return;
    event.stopPropagation();
    const current = positionOf(node);
    dragRef.current = { id: node.id, offsetX: event.clientX - current.x, offsetY: event.clientY - current.y };
    setDragId(node.id);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onCanvasDown = (event: React.PointerEvent<HTMLDivElement>) => {
    panRef.current = { startX: event.clientX, startY: event.clientY, baseX: pan.x, baseY: pan.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      const { id, offsetX, offsetY } = dragRef.current;
      setMoved((prev) => ({ ...prev, [id]: { x: event.clientX - offsetX, y: event.clientY - offsetY } }));
      return;
    }
    if (panRef.current) {
      const { startX, startY, baseX, baseY } = panRef.current;
      setPan({ x: baseX + (event.clientX - startX), y: baseY + (event.clientY - startY) });
    }
  };

  const endDrag = () => {
    dragRef.current = null;
    panRef.current = null;
    setDragId(null);
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    zoomStore.set(zoomStore.get() - event.deltaY * 0.0015);
  };

  return { moved, pan, dragId, linkFrom, setLinkFrom, positionOf, onNodeDown, onCanvasDown, onPointerMove, endDrag, onWheel };
}