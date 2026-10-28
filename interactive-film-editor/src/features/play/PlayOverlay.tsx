"use client";

import type { Dispatch } from "react";
import type { ProjectDoc, Scene } from "@/domain/project/schema";
import { availableChoices, type RuntimeAction, type RuntimeState } from "@/domain/runtime/state";
import { QteOverlay } from "./QteOverlay";

function ChoiceButton({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`film-choice-btn${primary ? " film-choice-btn-primary" : ""}`}>
      {label}
    </button>
  );
}

function ChoiceLayer({
  doc,
  state,
  dispatch,
}: {
  doc: ProjectDoc;
  state: RuntimeState;
  dispatch: Dispatch<RuntimeAction>;
}) {
  const choices = availableChoices(state, doc).filter((choice) => choice.visible);
  if (state.phase !== "choice") return null;
  return (
    <>
      {choices.map((choice) => (
        <ChoiceButton
          key={choice.id}
          label={choice.text}
          primary={choice.enabled}
          onClick={() => dispatch({ type: "choose", choiceId: choice.id })}
        />
      ))}
    </>
  );
}

function MenuLayer({
  scene,
  doc,
  state,
  dispatch,
}: {
  scene: Scene | undefined;
  doc: ProjectDoc;
  state: RuntimeState;
  dispatch: Dispatch<RuntimeAction>;
}) {
  if (state.phase !== "menu" || scene?.flow.kind !== "menu") return null;
  return (
    <>
      {scene.flow.items.map((item) => (
        <ChoiceButton
          key={item.id}
          label={item.label}
          onClick={() => {
            if (item.action.type === "goScene" && item.action.sceneId) {
              dispatch({ type: "goto", sceneId: item.action.sceneId });
            } else if (item.action.type === "continue") {
              dispatch({ type: "goto", sceneId: doc.start.sceneId });
            }
          }}
        />
      ))}
    </>
  );
}

function EndingLayer({
  scene,
  state,
  dispatch,
  onRestart,
}: {
  scene: Scene | undefined;
  state: RuntimeState;
  dispatch: Dispatch<RuntimeAction>;
  onRestart: () => void;
}) {
  if (state.phase === "ending") {
    return <ChoiceButton label="重新开始" primary onClick={onRestart} />;
  }
  if (state.phase === "settlement" && scene?.flow.kind === "settlement" && scene.flow.nextChapterNodeId) {
    return (
      <ChoiceButton
        label={scene.flow.nextBtnText}
        primary
        onClick={() => dispatch({ type: "goto", sceneId: scene.flow.nextChapterNodeId as string })}
      />
    );
  }
  return null;
}

/** 试玩叠层：QTE / 选项 / 菜单 / 结局与结算 */
export function PlayOverlay({
  doc,
  scene,
  state,
  dispatch,
  onRestart,
}: {
  doc: ProjectDoc;
  scene: Scene | undefined;
  state: RuntimeState;
  dispatch: Dispatch<RuntimeAction>;
  onRestart: () => void;
}) {
  const qte = scene?.flow.kind === "qte" ? scene.flow.qtes[0] : undefined;
  const feedbackClass =
    state.qteFeedback === "success" ? "film-feedback-flash" : state.qteFeedback === "fail" ? "film-feedback-fail" : null;

  return (
    <>
      {feedbackClass ? <div className={feedbackClass} /> : null}
      <div className="film-overlay-bottom">
        <div className="film-overlay-stack">
          <ChoiceLayer doc={doc} state={state} dispatch={dispatch} />
          {state.phase === "qte" && qte ? (
            <QteOverlay
              qte={qte}
              config={scene?.flow.kind === "qte" ? scene.flow.config : undefined}
              state={state}
              onInput={(input) => dispatch({ type: "qteInput", input })}
            />
          ) : null}
          <MenuLayer scene={scene} doc={doc} state={state} dispatch={dispatch} />
          <EndingLayer scene={scene} state={state} dispatch={dispatch} onRestart={onRestart} />
        </div>
      </div>
    </>
  );
}