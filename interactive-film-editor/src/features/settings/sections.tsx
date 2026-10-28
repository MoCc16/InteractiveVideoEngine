"use client";

import { useState } from "react";
import type { JsonPatchOp } from "@/domain/project/patch";
import type { ProjectDoc } from "@/domain/project/schema";
import { readThemeTokens, THEME_PRESETS, type ThemeTokens } from "@/domain/project/style";
import { PANEL_KINDS, PANEL_LABEL } from "@/domain/project/panels";
import { computeAllQuotes, quoteSummary, TARGET_LABEL } from "@/domain/project/export";

const COLOR_KEYS: Array<{ key: keyof ThemeTokens; label: string }> = [
  { key: "accent", label: "主色" },
  { key: "accentStrong", label: "强调色" },
  { key: "background", label: "背景色" },
  { key: "text", label: "文字色" },
];

const CANVAS_PRESETS = [
  { label: "横屏 1920×1080", w: 1920, h: 1080 },
  { label: "竖屏 1080×1920", w: 1080, h: 1920 },
  { label: "方形 1080×1080", w: 1080, h: 1080 },
  { label: "横屏 1280×720", w: 1280, h: 720 },
];

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="film-form-row">
      <span className="film-label">{label}</span>
      <div>{children}</div>
    </div>
  );
}

const hex = (value: string | undefined, fallback: string) =>
  /^#[0-9a-f]{6}$/i.test(value ?? "") ? (value as string) : fallback;

export function SplashSection({
  doc,
  apply,
}: {
  doc: ProjectDoc;
  apply: (ops: JsonPatchOp[]) => void;
}) {
  const splash = doc.splash;
  const set = (key: string, value: unknown) => apply([{ op: "add", path: `/splash/${key}`, value }]);

  return (
    <section className="film-panel">
      <h2 className="film-section-title">开场主界面</h2>
      <Row label="启用">
        <input type="checkbox" checked={splash?.enabled ?? false} onChange={(event) => set("enabled", event.target.checked)} />
      </Row>
      <Row label="标题">
        <input className="film-input" defaultValue={splash?.title ?? ""} onBlur={(event) => set("title", event.target.value)} />
      </Row>
      <Row label="副标题">
        <input className="film-input" defaultValue={splash?.subtitle ?? ""} onBlur={(event) => set("subtitle", event.target.value)} />
      </Row>
      <Row label="开始按钮文案">
        <input
          className="film-input"
          defaultValue={splash?.startLabel ?? "开始"}
          onBlur={(event) => set("startLabel", event.target.value)}
        />
      </Row>
      <Row label="主色">
        <div className="film-inline-fields">
          <input
            type="color"
            className="film-swatch"
            value={hex(splash?.accentColor, "#c9a84c")}
            onChange={(event) => set("accentColor", event.target.value)}
          />
          <span className="film-label film-mono">{splash?.accentColor ?? "#c9a84c"}</span>
        </div>
      </Row>
    </section>
  );
}

export function ThemeSection({ doc, apply }: { doc: ProjectDoc; apply: (ops: JsonPatchOp[]) => void }) {
  const tokens = readThemeTokens(doc);
  const setToken = (key: string, value: string) => apply([{ op: "add", path: `/theme/tokens/${key}`, value }]);

  return (
    <section className="film-panel">
      <h2 className="film-section-title">配色方案</h2>
      <div className="film-row-gap film-wrap">
        {THEME_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className="film-btn"
            onClick={() => COLOR_KEYS.forEach(({ key }) => setToken(key, preset.tokens[key]))}
            style={{ background: preset.tokens.background, borderColor: preset.tokens.accent, color: preset.tokens.text }}
          >
            {preset.name}
          </button>
        ))}
      </div>
      {COLOR_KEYS.map(({ key, label }) => (
        <Row key={key} label={label}>
          <div className="film-inline-fields">
            <input
              type="color"
              className="film-swatch"
              value={hex(tokens[key], "#000000")}
              onChange={(event) => setToken(key, event.target.value)}
            />
            <input
              className="film-input film-input-sm film-mono film-w-110"
              defaultValue={tokens[key]}
              onBlur={(event) => setToken(key, event.target.value)}
            />
          </div>
        </Row>
      ))}
    </section>
  );
}

export function CanvasSection({ doc, apply }: { doc: ProjectDoc; apply: (ops: JsonPatchOp[]) => void }) {
  return (
    <section className="film-panel">
      <h2 className="film-section-title">画布与字体</h2>
      <Row label="画布尺寸">
        <div className="film-inline-fields">
          <input
            type="number"
            className="film-input film-w-110"
            defaultValue={doc.canvas.width}
            onBlur={(event) => apply([{ op: "replace", path: "/canvas/width", value: Number(event.target.value) }])}
          />
          <span className="film-label">×</span>
          <input
            type="number"
            className="film-input film-w-110"
            defaultValue={doc.canvas.height}
            onBlur={(event) => apply([{ op: "replace", path: "/canvas/height", value: Number(event.target.value) }])}
          />
        </div>
      </Row>
      <Row label="默认字体">
        <input
          className="film-input"
          defaultValue={doc.theme?.defaultFont ?? ""}
          placeholder="如 'Noto Sans SC', sans-serif"
          onBlur={(event) => apply([{ op: "add", path: "/theme/defaultFont", value: event.target.value }])}
        />
      </Row>
      <Row label="预设">
        <div className="film-row-gap film-wrap">
          {CANVAS_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="film-btn"
              onClick={() =>
                apply([
                  { op: "replace", path: "/canvas/width", value: preset.w },
                  { op: "replace", path: "/canvas/height", value: preset.h },
                ])
              }
            >
              {preset.label}
            </button>
          ))}
        </div>
      </Row>
    </section>
  );
}

export function PanelSection({ doc, apply }: { doc: ProjectDoc; apply: (ops: JsonPatchOp[]) => void }) {
  return (
    <section className="film-panel">
      <h2 className="film-section-title">播放器面板</h2>
      <p className="film-label">设置 / 进度面板可换成场景页里编排的版式（浮层，不跳场景）。不选则使用内建面板。</p>
      {PANEL_KINDS.filter((kind) => kind !== "chapters").map((kind) => (
        <Row key={kind} label={PANEL_LABEL[kind]}>
          <select
            className="film-input"
            value={doc.panels?.[kind] ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              if (!value) {
                if (doc.panels?.[kind]) apply([{ op: "remove", path: `/panels/${kind}` }]);
                return;
              }
              apply([{ op: "add", path: `/panels/${kind}`, value }]);
            }}
          >
            <option value="">内建面板（不换皮）</option>
            {(doc.layouts?.shared ?? []).map((layout) => (
              <option key={layout.id} value={layout.id}>
                {layout.name ?? layout.id}
              </option>
            ))}
          </select>
        </Row>
      ))}
    </section>
  );
}

function projectIdFromUrl(): string {
  const match = window.location.pathname.match(/\/v2\/project\/([^/]+)/);
  return match?.[1] ?? "";
}

/** 导出：真实构建 zip 并下载（index.html + project.json + assets + manifest） */
export function ExportSection({ doc }: { doc: ProjectDoc }) {
  const quotes = computeAllQuotes(doc);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const build = async (target: string) => {
    setBusy(true);
    setMessage("正在构建…");
    try {
      const response = await fetch(`/api/projects/${projectIdFromUrl()}/export`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setMessage(body?.message ?? `构建失败（${response.status}）`);
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `export-${target}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      const warnings = Number(response.headers.get("x-export-warnings") ?? "0");
      const credits = response.headers.get("x-export-credits") ?? "?";
      setMessage(`已生成（${credits} 积分）${warnings > 0 ? ` · ${warnings} 个素材缺失` : ""}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="film-panel">
      <h2 className="film-section-title">导出作品</h2>
      <p className="film-label">
        按「200 积分 / 节点」计价，首次导出按全部节点计费；网页版与桌面版共用基线，第二个目标 5 折；安卓版独立基线。本机没有构建机，这里只做报价。
      </p>
      <table className="film-table">
        <tbody>
          {quotes.map((quote) => (
            <tr key={quote.target}>
              <td>{TARGET_LABEL[quote.target]}</td>
              <td className="film-num">{quote.billableNodes} 节点</td>
              <td className="film-num">{quote.finalPrice} 积分</td>
              <td className="film-label">{quote.discountApplied ? "5 折" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="film-row-gap">
        {quotes.map((quote) => (
          <button
            key={quote.target}
            type="button"
            className="film-btn"
            disabled={busy}
            onClick={() => void build(quote.target)}
          >
            构建{TARGET_LABEL[quote.target]}
          </button>
        ))}
        <span className="film-label">{message ?? quoteSummary(quotes[0] as never)}</span>
      </div>
    </section>
  );
}