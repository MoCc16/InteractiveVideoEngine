"use client";

import { useEffect, useRef, type Dispatch } from "react";
import type { RuntimeAction } from "@/domain/runtime/state";

/** 试玩时钟：running 时每 100ms 推进 dt * speed */
export function usePlayClock(running: boolean, speed: number, dispatch: Dispatch<RuntimeAction>) {
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    timer.current = setInterval(() => dispatch({ type: "tick", dt: 0.1 * speed }), 100);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running, speed, dispatch]);
}