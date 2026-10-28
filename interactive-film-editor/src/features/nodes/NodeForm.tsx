"use client";

import { useEditor } from "@/features/editor/EditorProvider";
import type { Scene } from "@/domain/project/schema";
import { AutoFlow, EndingFields, MenuFlow, QteFlow, Row, SettlementFlow, type FormContext } from "./NodeFlowEditors";
import { ChoiceFlowEditor } from "./ChoiceFlowEditor";
import { VideoBindingRow } from "./VideoBindingRow";

const FLOW_LABEL: Record<Scene["flow"]["kind"], string> = {
  auto: "播放节点",
  choice: "选择节点",
  qte: "QTE 节点",
  ending: "结局节点",
  menu: "主界面",
  settlement: "章节结算",
};

function FlowEditor({ ctx }: { ctx: FormContext }) {
  switch (ctx.scene.flow.kind) {
    case "choice":
      return <ChoiceFlowEditor ctx={ctx} />;
    case "qte":
      return <QteFlow ctx={ctx} />;
    case "menu":
      return <MenuFlow ctx={ctx} />;
    case "ending":
      return <EndingFields ctx={ctx} />;
    case "settlement":
      return <SettlementFlow ctx={ctx} />;
    case "auto":
    default:
      return <AutoFlow ctx={ctx} />;
  }
}

/** 节点表单：基础字段 + 按 flow 类型分支 */
export function NodeForm({ scene }: { scene: Scene }) {
  const { doc, apply } = useEditor();
  const index = doc.scenes.indexOf(scene);
  const ctx: FormContext = { doc, index, scene, apply };
  const inbound = doc.scenes.filter((item) => JSON.stringify(item.flow).includes(scene.id)).length;


  return (
    <div className="film-col-gap-3">
      <div>
        <div className="film-h2">{FLOW_LABEL[scene.flow.kind]}</div>
        <div className="film-label film-mono">
          {scene.id} · 入边 {inbound} · 布局 {scene.layoutId ?? "未指定"}
        </div>
      </div>

      <Row label="节点标题">
        <input
          className="film-input"
          defaultValue={scene.displayTitle ?? ""}
          placeholder={scene.title || "（无标题）"}
          onBlur={(event) => apply([{ op: "add", path: `/scenes/${index}/displayTitle`, value: event.target.value }])}
        />
      </Row>

      <Row label="章节">
        <select
          className="film-input"
          value={scene.chapterId ?? ""}
          onChange={(event) => apply([{ op: "add", path: `/scenes/${index}/chapterId`, value: event.target.value }])}
        >
          <option value="">未归章</option>
          {doc.chapters.map((chapter) => (
            <option key={chapter.id} value={chapter.id}>
              {chapter.name}
            </option>
          ))}
        </select>
      </Row>

      <VideoBindingRow doc={doc} scene={scene} index={index} apply={apply} />

      <div className="film-row-gap">
        <label className="film-label">
          <input
            type="checkbox"
            checked={scene.isStart}
            onChange={(event) => apply([{ op: "replace", path: `/scenes/${index}/isStart`, value: event.target.checked }])}
          />{" "}
          起始节点
        </label>
        <label className="film-label">
          <input
            type="checkbox"
            checked={scene.isEnding}
            onChange={(event) => apply([{ op: "replace", path: `/scenes/${index}/isEnding`, value: event.target.checked }])}
          />{" "}
          结局节点
        </label>
      </div>

      <div className="film-panel">
        <div className="film-label">流程配置（{scene.flow.kind}）</div>
        <FlowEditor ctx={ctx} />
      </div>
    </div>
  );
}