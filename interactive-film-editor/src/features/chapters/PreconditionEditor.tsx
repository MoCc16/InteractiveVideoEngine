"use client";

import type { JsonPatchOp } from "@/domain/project/patch";
import type { ProjectChapter, ProjectDoc } from "@/domain/project/schema";

type Precondition = NonNullable<ProjectChapter["precondition"]>;
type Rule = Precondition["rules"][number];

function RuleRow({
  rule,
  rulePath,
  doc,
  chapter,
  apply,
}: {
  rule: Rule;
  rulePath: string;
  doc: ProjectDoc;
  chapter: ProjectChapter;
  apply: (ops: JsonPatchOp[]) => void;
}) {
  const setRuleType = (type: Rule["type"]) => {
    const value = type === "chapter_done" ? { type, chapterIds: [] } : { type, flag: doc.variables[0]?.id ?? "", equals: true };
    apply([{ op: "replace", path: rulePath, value }]);
  };

  return (
    <div className="film-row-gap">
      <select className="film-input film-w-110" value={rule.type} onChange={(event) => setRuleType(event.target.value as Rule["type"])}>
        <option value="chapter_done">章节完成</option>
        <option value="variable">变量</option>
      </select>

      {rule.type === "chapter_done" ? (
        <select
          className="film-input film-select-multi"
          multiple
          value={rule.chapterIds}
          onChange={(event) =>
            apply([
              {
                op: "replace",
                path: `${rulePath}/chapterIds`,
                value: [...event.target.selectedOptions].map((option) => option.value),
              },
            ])
          }
        >
          {doc.chapters
            .filter((item) => item.id !== chapter.id)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
      ) : (
        <>
          <select
            className="film-input"
            value={rule.flag}
            onChange={(event) => apply([{ op: "replace", path: `${rulePath}/flag`, value: event.target.value }])}
          >
            {doc.variables.length === 0 ? <option value="">（先在变量页建变量）</option> : null}
            {doc.variables.map((variable) => (
              <option key={variable.id} value={variable.id}>
                {variable.name ?? variable.id}
              </option>
            ))}
          </select>
          <select
            className="film-input film-w-110"
            value={String(rule.equals)}
            onChange={(event) => apply([{ op: "replace", path: `${rulePath}/equals`, value: event.target.value === "true" }])}
          >
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </>
      )}

      <button type="button" className="film-btn" onClick={() => apply([{ op: "remove", path: rulePath }])}>
        ✕
      </button>
    </div>
  );
}

/** 章节解锁条件：AND/OR + 规则列表 */
export function PreconditionEditor({
  doc,
  chapter,
  base,
  apply,
}: {
  doc: ProjectDoc;
  chapter: ProjectChapter;
  base: string;
  apply: (ops: JsonPatchOp[]) => void;
}) {
  const precondition = chapter.precondition;
  const rules = precondition?.rules ?? [];

  return (
    <>
      <div className="film-row-gap">
        <span className="film-label">解锁条件</span>
        <select
          className="film-input film-w-110"
          value={precondition?.operator ?? "AND"}
          onChange={(event) =>
            apply([
              { op: "add", path: `${base}/precondition`, value: { operator: event.target.value, rules } },
            ])
          }
        >
          <option value="AND">AND</option>
          <option value="OR">OR</option>
        </select>
        <button
          type="button"
          className="film-btn"
          onClick={() =>
            apply([{ op: "add", path: `${base}/precondition/rules/-`, value: { type: "chapter_done", chapterIds: [] } }])
          }
        >
          添加规则
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="film-label">未设置前置条件 · 本章始终解锁</div>
      ) : (
        rules.map((rule, index) => (
          <RuleRow
            key={`${rule.type}-${index}`}
            rule={rule}
            rulePath={`${base}/precondition/rules/${index}`}
            doc={doc}
            chapter={chapter}
            apply={apply}
          />
        ))
      )}
    </>
  );
}