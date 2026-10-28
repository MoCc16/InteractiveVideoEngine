"use client";

import { useEffect, useState } from "react";

/** 画布缩放：底部缩放条与场景/故事图共享的极简 store */
type Listener = (zoom: number) => void;

let current = 1;
const listeners = new Set<Listener>();

export const zoomStore = {
  get: () => current,
  set(next: number) {
    current = Math.min(1.6, Math.max(0.2, Number(next.toFixed(3))));
    listeners.forEach((listener) => listener(current));
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** 页面挂载时设定初始缩放，并返回当前值 */
export function useStageZoom(initial: number): number {
  const [zoom, setZoom] = useState(initial);

  useEffect(() => {
    zoomStore.set(initial);
    return zoomStore.subscribe(setZoom);
  }, [initial]);

  return zoom;
}