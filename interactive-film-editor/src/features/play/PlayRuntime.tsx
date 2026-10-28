"use client";

import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from "react";
import type { ProjectDoc } from "@/domain/project/schema";
import { buildStyleContext } from "@/domain/project/style";
import { createRuntime, pickPersisted, reduce, sceneById, type RuntimeAction, type RuntimeState } from "@/domain/runtime/state";
import { resolvePanelLayout } from "@/domain/project/panels";
import { PlayStage } from "./PlayStage";
import { PanelOverlay } from "./PanelOverlay";
import { PlayOverlay } from "./PlayOverlay";
import { PlayControlBar, PlayPanels, PlayStatusChip, type PanelKind } from "./PlayChrome";
import { usePlayClock } from "./use-play-clock";
import { useVideoSync } from "./use-video-sync";
import { resolveSceneMedia } from "./scene-media";

const SCALE = 0.5;

function storageKey(projectId: string) {
  return `film:${projectId}:vars`;
}

function loadPersisted(projectId: string): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(storageKey(projectId)) ?? "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** 试玩：状态机 + 舞台 + 工具条/面板 + QTE 手势 */
export function PlayRuntime({ projectId, doc }: { projectId: string; doc: ProjectDoc }) {
  const [state, dispatch] = useReducer(
    (current: RuntimeState, action: RuntimeAction) => reduce(current, doc, action),
    undefined,
    () => createRuntime(doc, loadPersisted(projectId)),
  );
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [panel, setPanel] = useState<PanelKind>("none");
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const scene = sceneById(doc, state.sceneId);
  const styleCtx = useMemo(() => buildStyleContext(doc, (scene?.fields ?? {}) as Record<string, unknown>), [doc, scene]);
  const media = resolveSceneMedia(doc, scene);
  const videoSrc = media.src;
  const videoLoop = media.loop;

  usePlayClock(running, speed, dispatch);
  useVideoSync(videoRef, { running, phase: state.phase, sceneId: state.sceneId, src: videoSrc });
  usePersist(projectId, doc, state);

  const restart = () => {
    dispatch({ type: "reset" });
    setRunning(true);
  };


  const skinnedPanel = panel === "settings" || panel === "progress" ? panel : null;
  const skinnedLayout = skinnedPanel ? resolvePanelLayout(doc, skinnedPanel) : null;
  const canvasVars = { "--cw": doc.canvas.width, "--ch": doc.canvas.height, "--scale": SCALE } as CSSProperties;

  const videoLabel = media.label;

  const overlay = <PlayOverlay doc={doc} scene={scene} state={state} dispatch={dispatch} onRestart={restart} />;
  return (
    <div className="pg-player">
      <PlayStatusChip scene={scene} state={state} running={running} videoLabel={videoLabel} />
      <div className="pg-player-stage" style={canvasVars}>
        <div className="film-player-viewport" style={canvasVars}>
          <div className="film-canvas-scaled" style={canvasVars}>
            <PlayStage
              doc={doc}
              scene={scene}
              ctx={styleCtx}
              overlay={overlay}
              videoSrc={videoSrc}
              videoRef={videoRef}
              videoLoop={videoLoop}
              onVideoEnded={() => dispatch({ type: "videoEnded" })}
            />
          </div>
        </div>
      </div>

      <PlayControlBar
        doc={doc}
        state={state}
        running={running}
        speed={speed}
        panel={panel}
        onRestart={restart}
        onToggleRunning={() => setRunning((value) => !value)}
        onSpeed={setSpeed}
        onJump={(sceneId) => dispatch({ type: "goto", sceneId })}
        onPanel={setPanel}
      />
      {panel !== "none" ? (
        <aside className="ed-float-right">
          {skinnedPanel && skinnedLayout ? (
            <PanelOverlay kind={skinnedPanel} doc={doc} onClose={() => setPanel("none")} />
          ) : null}
          <PlayPanels
            kind={panel}
            doc={doc}
            state={state}
            scene={scene}
            running={running}
            speed={speed}
            onSpeed={setSpeed}
            onRunning={() => setRunning((value) => !value)}
            onRestart={restart}
          />
        </aside>
      ) : null}
    </div>
  );
}
function usePersist(projectId: string, doc: ProjectDoc, state: RuntimeState) {
  const payload = JSON.stringify(pickPersisted(doc, state.variables));
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey(projectId), payload);
  }, [projectId, payload]);
}