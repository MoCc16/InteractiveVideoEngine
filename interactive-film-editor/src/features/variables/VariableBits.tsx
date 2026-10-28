"use client";

import type { JsonPatchOp } from "@/domain/project/patch";
import type { ProjectVariable } from "@/domain/project/schema";

export const SCOPE_LABEL: Record<ProjectVariable["scope"], string> = {
  run: "每轮重置",
  session: "会话内保留",
  project: "项目持久",
};

export const FILTERS = [
  { key: "all", label: "全部" },
  { key: "run", label: "每轮重置" },
  { key: "session", label: "会话" },
  { key: "project", label: "项目持久" },
] as const;

export type VariableFilter = (typeof FILTERS)[number]["key"];

export function defaultFor(type: ProjectVariable["type"]): unknown {
  if (type === "number") return 0;
  if (type === "boolean") return false;
  return "";
}

export function NewVariableForm({
  draft,
  onDraft,
  onCreate,
}: {
  draft: { id: string; type: ProjectVariable["type"]; scope: ProjectVariable["scope"] };
  onDraft: (next: typeof draft) => void;
  onCreate: () => void;
}) {
  return (
    <div className="film-col-gap">
      <input
        className="film-input"
        aria-label="变量 ID"
        placeholder="变量 ID，如 affinity"
        value={draft.id}
        onChange={(event) => onDraft({ ...draft, id: event.target.value })}
      />
      <div className="film-row-gap">
        <select
          className="film-input"
          aria-label="类型"
          value={draft.type}
          onChange={(event) => onDraft({ ...draft, type: event.target.value as ProjectVariable["type"] })}
        >
          <option value="string">文本</option>
          <option value="number">数值</option>
          <option value="boolean">布尔</option>
        </select>
        <select
          className="film-input"
          aria-label="作用域"
          value={draft.scope}
          onChange={(event) => onDraft({ ...draft, scope: event.target.value as ProjectVariable["scope"] })}
        >
          <option value="run">每轮重置</option>
          <option value="session">会话</option>
          <option value="project">项目持久</option>
        </select>
      </div>
      <button type="button" className="film-btn" onClick={onCreate}>
        新建变量
      </button>
    </div>
  );
}

export function VariableRow({
  variable,
  index,
  apply,
}: {
  variable: ProjectVariable;
  index: number;
  apply: (ops: JsonPatchOp[]) => void;
}) {
  return (
    <tr>
      <td>
        {variable.id}
        <div className="film-label film-mono">{`\${var.${variable.id}}`}</div>
      </td>
      <td>{variable.type}</td>
      <td>{SCOPE_LABEL[variable.scope]}</td>
      <td>
        <input
          className="film-input film-input-sm film-w-120"
          aria-label={`${variable.id} 默认值`}
          defaultValue={String(variable.defaultValue ?? "")}
          onBlur={(event) => {
            const raw = event.target.value;
            const value = variable.type === "number" ? Number(raw) : variable.type === "boolean" ? raw === "true" : raw;
            apply([{ op: "replace", path: `/variables/${index}/defaultValue`, value }]);
          }}
        />
      </td>
      <td>
        <button type="button" className="film-btn film-btn-danger" onClick={() => apply([{ op: "remove", path: `/variables/${index}` }])}>
          删除
        </button>
      </td>
    </tr>
  );
}