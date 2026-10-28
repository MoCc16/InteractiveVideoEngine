"use client";

import type { ReactNode } from "react";
import type { ProjectDoc, Scene } from "@/domain/project/schema";
import type { RuntimeState } from "@/domain/runtime/state";
import { unlockedChapters } from "@/domain/runtime/state";

export type PanelKind = "none" | "settings" | "progress" | "inspect";

export const SPEEDS = [0.5, 1, 1.5, 2] as const;

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="film-panel">
      <div className="film-section-title">{title}</div>
      {children}
    </section>
  );
}

export function PlayToolbar({
  doc,
  state,
  running,
  videoLabel,
  panel,
  onPanel,
  onRestart,
  onJump,
}: {
  doc: ProjectDoc;
  state: RuntimeState;
  running: boolean;
  videoLabel: string;
  panel: PanelKind;
  onPanel: (next: PanelKind) => void;
  onRestart: () => void;
  onJump: (sceneId: string) => void;
}) {
  const toggles: Array<{ kind: PanelKind; label: string }> = [
    { kind: "inspect", label: "检查面板" },
    { kind: "settings", label: "设置" },
    { kind: "progress", label: "进度" },
  ];

  return (
    <div className="film-row-gap film-wrap">
      <button type="button" className="film-btn" onClick={onRestart}>
        重新开始
      </button>
      <SceneJump doc={doc} sceneId={state.sceneId} onJump={onJump} />
      {toggles.map((item) => (
        <button key={item.kind} type="button" className="film-btn" onClick={() => onPanel(panel === item.kind ? "none" : item.kind)}>
          {item.label}
        </button>
      ))}
      <span className="film-label">
        {state.phase} · {state.elapsed.toFixed(1)}s · {running ? "运行中" : "已暂停"} · {videoLabel}
        {state.phase === "qte" ? ` · QTE ${state.qteHits}` : ""}
      </span>
    </div>
  );
}

function SceneJump({ doc, sceneId, onJump }: { doc: ProjectDoc; sceneId: string; onJump: (id: string) => void }) {
  return (
    <select className="film-input film-w-220" aria-label="跳场景" value={sceneId} onChange={(event) => onJump(event.target.value)}>
      {doc.scenes.map((item) => (
        <option key={item.id} value={item.id}>
          {item.displayTitle || item.title || item.id}
        </option>
      ))}
    </select>
  );
}

function SettingsPanel({
  speed,
  running,
  onSpeed,
  onRunning,
  onRestart,
}: {
  speed: number;
  running: boolean;
  onSpeed: (value: number) => void;
  onRunning: () => void;
  onRestart: () => void;
}) {
  return (
    <Panel title="设置">
      <div className="film-row-gap">
        {SPEEDS.map((item) => (
          <button
            key={item}
            type="button"
            className={`film-btn${speed === item ? " film-btn-primary" : ""}`}
            onClick={() => onSpeed(item)}
          >
            {item}x
          </button>
        ))}
      </div>
      <button type="button" className="film-btn" onClick={onRunning}>
        {running ? "暂停" : "继续"}
      </button>
      <button type="button" className="film-btn" onClick={onRestart}>
        重新开始
      </button>
    </Panel>
  );
}

function ProgressPanel({ doc, state, scene }: { doc: ProjectDoc; state: RuntimeState; scene: Scene | undefined }) {
  const chapters = unlockedChapters(state, doc);
  const endings = doc.scenes.filter((item) => item.flow.kind === "ending").length;
  return (
    <Panel title="进度">
      <div className="film-label">当前章节：{scene?.chapterId ?? "未归章"}</div>
      <div className="film-label">
        已完成章节：{state.chaptersDone.length} / {doc.chapters.length}
      </div>
      <div className="film-label">
        结局落盘：{state.endings.length} / {endings}
      </div>
      <div className="film-label">场景足迹：{state.visited.length} 步</div>
      <div className="film-label">已解锁章节：{chapters.length}</div>
    </Panel>
  );
}

function InspectPanel({ state }: { state: RuntimeState }) {
  const entries = Object.entries(state.variables);
  return (
    <Panel title="检查面板">
      <div className="film-label film-mono">场景：{state.sceneId}</div>
      <div className="film-label">阶段：{state.phase}</div>
      <div className="film-label">帧时间：{state.elapsed.toFixed(2)}s</div>
      <div className="film-label">最后事件：{state.lastEvent}</div>
      <div className="film-label">变量：</div>
      {entries.length === 0 ? (
        <div className="film-label film-disabled-text">（无变量）</div>
      ) : (
        entries.map(([key, value]) => (
          <div key={key} className="film-label film-mono">
            {key} = {String(value)}
          </div>
        ))
      )}
    </Panel>
  );
}

export function PlayPanels({
  kind,
  doc,
  state,
  scene,
  running,
  speed,
  onSpeed,
  onRunning,
  onRestart,
}: {
  kind: PanelKind;
  doc: ProjectDoc;
  state: RuntimeState;
  scene: Scene | undefined;
  running: boolean;
  speed: number;
  onSpeed: (value: number) => void;
  onRunning: () => void;
  onRestart: () => void;
}) {
  if (kind === "settings") {
    return <SettingsPanel speed={speed} running={running} onSpeed={onSpeed} onRunning={onRunning} onRestart={onRestart} />;
  }
  if (kind === "progress") return <ProgressPanel doc={doc} state={state} scene={scene} />;
  if (kind === "inspect") return <InspectPanel state={state} />;
  return <div className="film-label">顶部可打开「设置 / 进度 / 检查面板」。选项、QTE、菜单都按运行时状态出现。</div>;
}
/** 试玩底部悬浮控制条 */
export function PlayControlBar({
  doc,
  state,
  running,
  speed,
  panel,
  onRestart,
  onToggleRunning,
  onSpeed,
  onJump,
  onPanel,
}: {
  doc: ProjectDoc;
  state: RuntimeState;
  running: boolean;
  speed: number;
  panel: PanelKind;
  onRestart: () => void;
  onToggleRunning: () => void;
  onSpeed: (value: number) => void;
  onJump: (sceneId: string) => void;
  onPanel: (next: PanelKind) => void;
}) {
  const toggle = (kind: PanelKind) => onPanel(panel === kind ? "none" : kind);
  return (
    <div className="pg-player-bar">
      <button type="button" className="ed-zoom-btn" aria-label="重新开始" onClick={onRestart}>
        ↺
      </button>
      <button type="button" className="ed-zoom-btn ed-zoom-pct" aria-label={running ? "暂停" : "继续"} onClick={onToggleRunning}>
        {running ? "❚❚" : "▶"}
      </button>
      {SPEEDS.map((item) => (
        <button
          key={item}
          type="button"
          className={`ed-zoom-btn${speed === item ? " ed-zoom-active" : ""}`}
          onClick={() => onSpeed(item)}
        >
          {item}x
        </button>
      ))}
      <span className="ed-zoom-sep" />
      <select
        className="ed-zoom-btn"
        aria-label="跳场景"
        value={state.sceneId}
        onChange={(event) => onJump(event.target.value)}
      >
        {doc.scenes.map((item) => (
          <option key={item.id} value={item.id}>
            {item.displayTitle || item.title || item.id}
          </option>
        ))}
      </select>
      <span className="ed-zoom-sep" />
      {(["inspect", "settings", "progress"] as const).map((kind) => (
        <button
          key={kind}
          type="button"
          className={`ed-zoom-btn${panel === kind ? " ed-zoom-active" : ""}`}
          onClick={() => toggle(kind)}
        >
          {kind === "inspect" ? "检查" : kind === "settings" ? "设置" : "进度"}
        </button>
      ))}
    </div>
  );
}
/** 试玩顶部状态 chip */
export function PlayStatusChip({
  scene,
  state,
  running,
  videoLabel,
}: {
  scene: Scene | undefined;
  state: RuntimeState;
  running: boolean;
  videoLabel: string;
}) {
  const title = scene?.displayTitle || scene?.title || scene?.id || "未选择节点";
  return (
    <div className="pg-player-chip">
      <span>{title}</span>
      <span>
        {state.phase} · {state.elapsed.toFixed(1)}s · {running ? "运行中" : "已暂停"} · {videoLabel}
        {state.phase === "qte" ? ` · QTE ${state.qteHits}` : ""}
      </span>
    </div>
  );
}