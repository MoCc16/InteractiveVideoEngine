"use client";

import { useState } from "react";
import type { JsonPatchOp } from "@/domain/project/patch";
import type { Component } from "@/domain/project/schema";
import { resolveBox, type Box } from "@/domain/project/anchor";
import { readStyleValue, resolveStyle, type StyleContext } from "@/domain/project/style";
import { componentSpec } from "./registry";

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="film-kv">
      <span className="film-kv-key">{k}</span>
      <span className="film-kv-val">{v}</span>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="film-form-row-sm">
      <span className="film-kv-key">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function ContentTab({
  component,
  path,
  parentBox,
  apply,
}: {
  component: Component;
  path: string;
  parentBox: Box;
  apply: (ops: JsonPatchOp[]) => void;
}) {
  const spec = componentSpec(component.type);
  const box = resolveBox(component, parentBox, { autoWidth: spec.autoWidth, autoHeight: spec.autoHeight });
  const content = component.content;
  const isBinding = content?.kind === "binding";

  const commit = (value: string) => {
    if (isBinding) apply([{ op: "replace", path: `${path}/content/expr`, value }]);
    else apply([{ op: "add", path: `${path}/content`, value: { kind: "literal", value } }]);
  };

  return (
    <div className="film-block">
      {spec.editableText ? (
        <label className="film-block">
          <span className="film-label">{isBinding ? "绑定表达式" : "内容"}</span>
          <input
            className="film-input film-input-sm"
            defaultValue={isBinding ? content?.expr ?? "" : String(content?.value ?? "")}
            onBlur={(event) => commit(event.target.value)}
          />
        </label>
      ) : (
        <div className="film-label film-disabled-text">该元件内容由模板/绑定决定</div>
      )}

      <div>
        <Kv k="x / y" v={`${box.x} / ${box.y}`} />
        <Kv k="w × h" v={`${box.width} × ${box.height}`} />
        <Kv k="z" v={String(component.z ?? 0)} />
        <Kv k="rotation" v={`${component.rotation ?? 0}°`} />
      </div>

      <div>
        <div className="film-label">锚点</div>
        {(["top", "right", "bottom", "left"] as const).map((side) => {
          const anchor = component.anchors?.[side];
          return (
            <Kv
              key={side}
              k={side}
              v={
                anchor
                  ? `${anchor.value}${anchor.unit}${anchor.offset ? ` ${anchor.offset > 0 ? "+" : ""}${anchor.offset}` : ""}`
                  : "—"
              }
            />
          );
        })}
      </div>
    </div>
  );
}

type NumericKey = "fontSize" | "fontWeight" | "lineHeight" | "letterSpacing" | "opacity" | "borderRadius" | "borderWidth";
type ColorKey = "color" | "backgroundColor" | "borderColor";

function AppearanceTab({
  component,
  path,
  ctx,
  apply,
}: {
  component: Component;
  path: string;
  ctx: StyleContext;
  apply: (ops: JsonPatchOp[]) => void;
}) {
  const resolved = resolveStyle(component, ctx);
  const setLiteral = (key: string, value: unknown) =>
    apply([{ op: "add", path: `${path}/style/${key}`, value: { kind: "literal", value } }]);
  const raw = (key: string) => readStyleValue(component, key, ctx);

  const numberRow = (key: NumericKey, label: string, step = 1) => (
    <Row label={label}>
      <input
        className="film-input film-input-sm"
        type="number"
        step={step}
        defaultValue={String(raw(key) ?? resolved[key])}
        onBlur={(event) => setLiteral(key, Number(event.target.value))}
      />
    </Row>
  );

  const colorRow = (key: ColorKey, label: string) => {
    const value = String(raw(key) ?? resolved[key] ?? "");
    const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
    return (
      <Row label={label}>
        <div className="film-inline-fields">
          <input type="color" className="film-swatch" value={hex} onChange={(event) => setLiteral(key, event.target.value)} />
          <input
            className="film-input film-input-sm film-mono"
            defaultValue={value}
            onBlur={(event) => setLiteral(key, event.target.value)}
          />
        </div>
      </Row>
    );
  };

  return (
    <div className="film-block">
      <div className="film-label">排版</div>
      {numberRow("fontSize", "字号")}
      {numberRow("fontWeight", "字重", 100)}
      {numberRow("lineHeight", "行高", 0.1)}
      {numberRow("letterSpacing", "字间距", 0.5)}
      <Row label="对齐">
        <select
          className="film-input film-input-sm"
          value={resolved.textAlign}
          onChange={(event) => setLiteral("textAlign", event.target.value)}
        >
          <option value="left">左</option>
          <option value="center">中</option>
          <option value="right">右</option>
        </select>
      </Row>

      <div className="film-label">颜色</div>
      {colorRow("color", "文字色")}
      {colorRow("backgroundColor", "背景色")}
      {colorRow("borderColor", "描边色")}

      <div className="film-label">边框与效果</div>
      {numberRow("borderWidth", "描边宽")}
      {numberRow("borderRadius", "圆角")}
      {numberRow("opacity", "不透明度", 0.05)}
      <Row label="阴影">
        <input
          className="film-input film-input-sm"
          defaultValue={String(raw("boxShadow") ?? "")}
          placeholder="0 4px 12px rgba(0,0,0,.45)"
          onBlur={(event) => setLiteral("boxShadow", event.target.value)}
        />
      </Row>
    </div>
  );
}

/** 属性面板：内容 / 外观 两个页签 */
export function PropertyPanel({
  component,
  path,
  parentBox,
  ctx,
  apply,
}: {
  component: Component | null;
  path: string | null;
  parentBox: Box;
  ctx: StyleContext;
  apply: (ops: JsonPatchOp[]) => void;
}) {
  const [tab, setTab] = useState<"content" | "appearance">("content");

  if (!component || !path) {
    return <div className="film-label">在画布或图层树里选择一个元件</div>;
  }

  const spec = componentSpec(component.type);
  return (
    <div className="film-block">
      <div>
        <div className="film-h2">{spec.label}</div>
        <div className="film-label film-mono">{component.id}</div>
      </div>

      <div className="film-seg">
        {(["content", "appearance"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`film-seg-item${tab === key ? " film-seg-item-active" : ""}`}
          >
            {key === "content" ? "内容" : "外观"}
          </button>
        ))}
      </div>

      {tab === "content" ? (
        <ContentTab component={component} path={path} parentBox={parentBox} apply={apply} />
      ) : (
        <AppearanceTab component={component} path={path} ctx={ctx} apply={apply} />
      )}
    </div>
  );
}
