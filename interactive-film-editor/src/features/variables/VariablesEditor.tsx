"use client";

import { useState } from "react";
import { useEditor } from "@/features/editor/EditorProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import type { ProjectVariable } from "@/domain/project/schema";
import { FILTERS, NewVariableForm, VariableRow, defaultFor, type VariableFilter } from "./VariableBits";

/** 变量页：左新建面板 + 右变量表格面板 */
export function VariablesEditor() {
  const { doc, apply } = useEditor();
  const [filter, setFilter] = useState<VariableFilter>("all");
  const [draft, setDraft] = useState<{ id: string; type: ProjectVariable["type"]; scope: ProjectVariable["scope"] }>({
    id: "",
    type: "number",
    scope: "session",
  });

  const variables = doc.variables.filter((variable) => filter === "all" || variable.scope === filter);

  const addVariable = () => {
    const id = draft.id.trim();
    if (!id || doc.variables.some((variable) => variable.id === id)) return;
    apply([
      {
        op: "add",
        path: "/variables/-",
        value: { id, type: draft.type, scope: draft.scope, defaultValue: defaultFor(draft.type) },
      },
    ]);
    setDraft({ id: "", type: draft.type, scope: draft.scope });
  };

  return (
    <div>
      <PageHeader
        title="变量"
        subtitle={`${doc.variables.length} 个 · 用 ${"${var.x}"} 绑定`}
        actions={
          <div className="film-row-gap film-wrap">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`film-btn${filter === item.key ? " film-btn-primary" : ""}`}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="pg-layout-reverse">
        <div className="pg-panel">
          {variables.length === 0 ? (
            <div className="pg-empty">还没有变量，左侧新建一个</div>
          ) : (
            <table className="film-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>类型</th>
                  <th>作用域</th>
                  <th>默认值</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {variables.map((variable) => (
                  <VariableRow
                    key={variable.id}
                    variable={variable}
                    index={doc.variables.indexOf(variable)}
                    apply={apply}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="pg-panel">
          <div className="film-section-title">新建变量</div>
          <NewVariableForm draft={draft} onDraft={setDraft} onCreate={addVariable} />
          <div className="film-label">变量可作为章节解锁条件，也可在文本元件里用 {"${var.x}"} 绑定。</div>
        </div>
      </div>
    </div>
  );
}