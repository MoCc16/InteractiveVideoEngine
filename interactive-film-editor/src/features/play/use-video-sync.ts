"use client";

import { useEffect, type RefObject } from "react";

/** 让 <video> 跟随运行时：运行且未结束时播放，否则暂停 */
export function useVideoSync(
  videoRef: RefObject<HTMLVideoElement | null>,
  deps: { running: boolean; phase: string; sceneId: string; src: string | undefined },
) {
  const { running, phase, sceneId, src } = deps;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (running && phase !== "ending") {
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [videoRef, running, phase, sceneId, src]);
}