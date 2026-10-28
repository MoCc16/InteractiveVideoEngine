"use client";

import type { JsonPatchOp } from "@/domain/project/patch";
import type { ProjectDoc, Scene } from "@/domain/project/schema";

export interface FormContext {
  doc: ProjectDoc;
  index: number;
  scene: Scene;
  apply: (ops: JsonPatchOp[]) => void;
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="film-form-row">
      <span className="film-label">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function sceneOptions(doc: ProjectDoc, excludeId: string) {
  return doc.scenes
    .filter((item) => item.id !== excludeId)
    .map((item) => ({ id: item.id, label: item.displayTitle || item.title || item.id }));
}

function nextSelect(ctx: FormContext, value: string | undefined, onChange: (value: string) => void) {
  return (
    <select className="film-input" value={value ?? ""} onChange={(event) => onChange(event.target.value)}>
      <option value="">未设置</option>
      {sceneOptions(ctx.doc, ctx.scene.id).map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function AutoFlow({ ctx }: { ctx: FormContext }) {
  const flow = ctx.scene.flow;
  if (flow.kind !== "auto") return null;
  return (
    <Row label="下一节点">
      {nextSelect(ctx, flow.nextSceneId, (value) =>
        ctx.apply([{ op: "add", path: `/scenes/${ctx.index}/flow/nextSceneId`, value }]),
      )}
    </Row>
  );
}

export function QteFlow({ ctx }: { ctx: FormContext }) {
  const flow = ctx.scene.flow;
  if (flow.kind !== "qte") return null;
  const qte = flow.qtes[0];
  if (!qte) return <div className="film-label">该 QTE 节点还没有判定动作</div>;
  const base = `/scenes/${ctx.index}/flow/qtes/0`;
  return (
    <div className="film-col-gap">
      <Row label="判定形式">
        <select
          className="film-input"
          value={qte.kind}
          onChange={(event) => ctx.apply([{ op: "replace", path: `${base}/kind`, value: event.target.value }])}
        >
          <option value="tap">单次点击</option>
          <option value="mash">连点蓄力</option>
          <option value="direction">方向滑动/按键</option>
          <option value="timing">时机判定</option>
        </select>
      </Row>
      <Row label="触发时间(s)">
        <input
          className="film-input"
          type="number"
          step="0.1"
          defaultValue={qte.startSec}
          onBlur={(event) =>
            ctx.apply([{ op: "replace", path: `${base}/startSec`, value: Number(event.target.value) }])
          }
        />
      </Row>
      <Row label="限时时长(s)">
        <input
          className="film-input"
          type="number"
          step="0.1"
          defaultValue={(qte.endSec - qte.startSec).toFixed(2)}
          onBlur={(event) => {
            const duration = Number(event.target.value);
            if (duration > 0) {
              ctx.apply([{ op: "replace", path: `${base}/endSec`, value: Number(qte.startSec) + duration }]);
            }
          }}
        />
      </Row>
      <Row label="成功去向">
        {nextSelect(ctx, qte.onSuccess.nextSceneId, (value) =>
          ctx.apply([{ op: "add", path: `${base}/onSuccess/nextSceneId`, value }]),
        )}
      </Row>
      <Row label="失败去向">
        {nextSelect(ctx, qte.onFail.nextSceneId, (value) =>
          ctx.apply([{ op: "add", path: `${base}/onFail/nextSceneId`, value }]),
        )}
      </Row>
    </div>
  );
}

export function MenuFlow({ ctx }: { ctx: FormContext }) {
  const flow = ctx.scene.flow;
  if (flow.kind !== "menu") return null;
  return (
    <div className="film-col-gap">
      <div className="film-label">菜单按钮 {flow.items.length} 项</div>
      {flow.items.map((item, index) => (
        <div key={item.id} className="film-grid-3">
          <input
            className="film-input"
            defaultValue={item.label}
            onBlur={(event) =>
              ctx.apply([{ op: "replace", path: `/scenes/${ctx.index}/flow/items/${index}/label`, value: event.target.value }])
            }
          />
          <select
            className="film-input"
            value={item.action.type}
            onChange={(event) =>
              ctx.apply([
                {
                  op: "replace",
                  path: `/scenes/${ctx.index}/flow/items/${index}/action`,
                  value: { ...item.action, type: event.target.value },
                },
              ])
            }
          >
            <option value="goScene">跳场景</option>
            <option value="continue">继续</option>
            <option value="openPanel">打开面板</option>
            <option value="quit">退出</option>
            <option value="event">派发事件</option>
          </select>
          <select
            className="film-input"
            value={item.action.sceneId ?? ""}
            disabled={item.action.type !== "goScene"}
            onChange={(event) =>
              ctx.apply([
                {
                  op: "replace",
                  path: `/scenes/${ctx.index}/flow/items/${index}/action`,
                  value: { ...item.action, sceneId: event.target.value },
                },
              ])
            }
          >
            <option value="">目标</option>
            {sceneOptions(ctx.doc, ctx.scene.id).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

export function SettlementFlow({ ctx }: { ctx: FormContext }) {
  const flow = ctx.scene.flow;
  if (flow.kind !== "settlement") return <div className="film-label">该节点不是结算节点</div>;
  return (
    <Row label="下一章节点">
      {nextSelect(ctx, flow.nextChapterNodeId, (value) =>
        ctx.apply([{ op: "add", path: `/scenes/${ctx.index}/flow/nextChapterNodeId`, value }]),
      )}
    </Row>
  );
}

export function EndingFields({ ctx }: { ctx: FormContext }) {
  const fields = (ctx.scene.fields ?? {}) as Record<string, unknown>;
  const write = (key: string, value: string) =>
    ctx.apply([{ op: "add", path: `/scenes/${ctx.index}/fields/${key}`, value }]);
  return (
    <div className="film-col-gap">
      <Row label="结局标题">
        <input
          className="film-input"
          defaultValue={String(fields["结局标题"] ?? "")}
          onBlur={(event) => write("结局标题", event.target.value)}
        />
      </Row>
      <Row label="结局描述">
        <input
          className="film-input"
          defaultValue={String(fields["结局描述"] ?? "")}
          onBlur={(event) => write("结局描述", event.target.value)}
        />
      </Row>
      <Row label="线索文案">
        <input
          className="film-input"
          defaultValue={String(fields["线索"] ?? "")}
          onBlur={(event) => write("线索", event.target.value)}
        />
      </Row>
    </div>
  );
}