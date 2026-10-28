"use client";

import type { Scene } from "@/domain/project/schema";
import type { RuntimeState } from "@/domain/runtime/state";

type QteFlow = Extract<Scene["flow"], { kind: "qte" }>;
type QteAction = QteFlow["qtes"][number];
type Input = { kind: "tap" } | { kind: "direction"; direction: string } | { kind: "choice"; choiceId: string };

const DIRECTIONS: Array<{ key: "up" | "down" | "left" | "right"; label: string }> = [
  { key: "up", label: "↑" },
  { key: "down", label: "↓" },
  { key: "left", label: "←" },
  { key: "right", label: "→" },
];

function DirectionPad({ armed, warning, onInput }: { armed: boolean; warning: boolean; onInput: (input: Input) => void }) {
  return (
    <div className="film-qte-dirs">
      {DIRECTIONS.map((dir) => (
        <button
          key={dir.key}
          type="button"
          className={`film-qte-dir${warning ? " film-qte-warn" : ""}`}
          disabled={!armed}
          onClick={() => onInput({ kind: "direction", direction: dir.key })}
        >
          {dir.label}
        </button>
      ))}
    </div>
  );
}

function TimingPad({
  choices,
  armed,
  elapsed,
  onInput,
}: {
  choices: NonNullable<QteAction["choices"]>;
  armed: boolean;
  elapsed: number;
  onInput: (input: Input) => void;
}) {
  return (
    <div className="film-qte-timing">
      {choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          className="film-qte-choice"
          disabled={!armed || elapsed < choice.atSec}
          onClick={() => onInput({ kind: "choice", choiceId: choice.id })}
        >
          {choice.label}
        </button>
      ))}
    </div>
  );
}

function TapButton({
  kind,
  hits,
  required,
  armed,
  warning,
  onInput,
}: {
  kind: "tap" | "mash";
  hits: number;
  required: number;
  armed: boolean;
  warning: boolean;
  onInput: (input: Input) => void;
}) {
  return (
    <button
      type="button"
      className={`film-qte-hit${warning ? " film-qte-warn" : ""}`}
      disabled={!armed}
      onClick={() => onInput({ kind: "tap" })}
    >
      <span className="film-qte-count">
        {hits}/{required}
      </span>
      <span className="film-qte-hint">{kind === "mash" ? "连打" : "点击"}</span>
    </button>
  );
}

/** QTE 叠层：按判定形式渲染不同手势入口 */
export function QteOverlay({
  qte,
  config,
  state,
  onInput,
}: {
  qte: QteAction;
  config?: QteFlow["config"];
  state: RuntimeState;
  onInput: (input: Input) => void;
}) {
  if (state.qteResolved || state.elapsed > qte.endSec) return null;

  const required = qte.required ?? qte.threshold ?? 1;
  const armed = state.elapsed >= qte.startSec;
  const warnAt = qte.startSec - (config?.prewarnMs ?? 800) / 1000;
  const warning = state.elapsed >= warnAt && !armed;
  const kind = qte.kind;

  return (
    <div className="film-qte-layer">
      {config?.promptText ? <div className="film-qte-prompt">{config.promptText}</div> : null}
      {kind === "direction" ? <DirectionPad armed={armed} warning={warning} onInput={onInput} /> : null}
      {kind === "timing" ? (
        <TimingPad choices={qte.choices ?? []} armed={armed} elapsed={state.elapsed} onInput={onInput} />
      ) : null}
      {kind === "tap" || kind === "mash" ? (
        <TapButton
          kind={kind}
          hits={state.qteHits}
          required={required}
          armed={armed}
          warning={warning}
          onInput={onInput}
        />
      ) : null}
    </div>
  );
}