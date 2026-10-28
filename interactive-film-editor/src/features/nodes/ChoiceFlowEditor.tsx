"use client";

import type { FormContext } from "./NodeFlowEditors";
import { Row } from "./NodeFlowEditors";

type Choice = Extract<FormContext["scene"]["flow"], { kind: "choice" }>["choices"][number];

function ChoiceRow({
  choice,
  choicePath,
  others,
  apply,
}: {
  choice: Choice;
  choicePath: string;
  others: Array<{ id: string; label: string }>;
  apply: FormContext["apply"];
}) {
  return (
    <div className="film-choice-card">
      <div className="film-grid-4">
        <input
          className="film-input"
          aria-label="选项文字"
          defaultValue={choice.text}
          onBlur={(event) => apply([{ op: "replace", path: `${choicePath}/text`, value: event.target.value }])}
        />
        <input
          className="film-input"
          aria-label="出现秒"
          type="number"
          step="0.1"
          defaultValue={choice.appearAt}
          onBlur={(event) => apply([{ op: "replace", path: `${choicePath}/appearAt`, value: Number(event.target.value) }])}
        />
        <select
          className="film-input"
          aria-label="跳转到"
          value={choice.nextSceneId ?? ""}
          onChange={(event) => apply([{ op: "add", path: `${choicePath}/nextSceneId`, value: event.target.value }])}
        >
          <option value="">未设置</option>
          {others.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <button type="button" className="film-btn film-btn-danger" aria-label="删除选项" onClick={() => apply([{ op: "remove", path: choicePath }])}>
          ✕
        </button>
      </div>
    </div>
  );
}

function TimeoutRow({ ctx, base }: { ctx: FormContext; base: string }) {
  const flow = ctx.scene.flow;
  if (flow.kind !== "choice") return null;
  return (
    <Row label="限时选择">
      <div className="film-inline-fields">
        <input
          className="film-input film-w-120"
          aria-label="限时秒数"
          type="number"
          step="0.5"
          placeholder="不限时"
          defaultValue={flow.choiceTimeout?.sec ?? ""}
          onBlur={(event) => {
            const value = event.target.value.trim();
            if (!value) {
              if (flow.choiceTimeout) ctx.apply([{ op: "remove", path: `${base}/choiceTimeout` }]);
              return;
            }
            ctx.apply([{ op: "add", path: `${base}/choiceTimeout`, value: { sec: Number(value) } }]);
          }}
        />
        <span className="film-label">留空 = 不限时</span>
      </div>
    </Row>
  );
}

export function ChoiceFlowEditor({ ctx }: { ctx: FormContext }) {
  const flow = ctx.scene.flow;
  if (flow.kind !== "choice") return null;
  const base = `/scenes/${ctx.index}/flow`;
  const others = ctx.doc.scenes
    .filter((item) => item.id !== ctx.scene.id)
    .map((item) => ({ id: item.id, label: item.displayTitle || item.title || item.id }));

  const addChoice = () => {
    const id = `c_${Math.random().toString(36).slice(2, 9)}`;
    ctx.apply([
      {
        op: "add",
        path: `${base}/choices/-`,
        value: { id, text: "新选项", appearAt: 0, sortOrder: flow.choices.length },
      },
    ]);
  };

  return (
    <div className="film-col-gap">
      <div className="film-row-gap">
        <span className="film-label">选项列表 {flow.choices.length} 项</span>
        <button type="button" className="film-btn" onClick={addChoice}>
          添加选项
        </button>
      </div>
      {flow.choices.map((choice, index) => (
        <ChoiceRow
          key={choice.id}
          choice={choice}
          choicePath={`${base}/choices/${index}`}
          others={others}
          apply={ctx.apply}
        />
      ))}
      <TimeoutRow ctx={ctx} base={base} />
    </div>
  );
}