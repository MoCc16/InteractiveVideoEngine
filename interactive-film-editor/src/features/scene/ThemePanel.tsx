"use client";

import { useEditor } from "@/features/editor/EditorProvider";
import { readThemeTokens, THEME_PRESETS, type ThemeTokens } from "@/domain/project/style";

const COLOR_KEYS: Array<{ key: keyof ThemeTokens; label: string }> = [
  { key: "accent", label: "主色" },
  { key: "accentStrong", label: "强调色" },
  { key: "background", label: "背景色" },
  { key: "text", label: "文字色" },
];

/** 配色方案：3 套预设 + 4 色微调，全部写进 theme.tokens（元件未显式设色时跟随） */
export function ThemePanel() {
  const { doc, apply } = useEditor();
  const tokens = readThemeTokens(doc);

  const applyPreset = (preset: ThemeTokens) => {
    apply(COLOR_KEYS.map(({ key }) => ({ op: "add" as const, path: `/theme/tokens/${key}`, value: preset[key] })));
  };

  return (
    <div className="film-panel">
      <div className="film-label">配色方案</div>
      <div className="film-row-gap film-wrap">
        {THEME_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => applyPreset(preset.tokens)}
            title={`应用「${preset.name}」`}
            className="film-btn"
            style={{ background: preset.tokens.background, borderColor: preset.tokens.accent, color: preset.tokens.text }}
          >
            {preset.name}
          </button>
        ))}
      </div>
      {COLOR_KEYS.map(({ key, label }) => (
        <div key={key} className="film-row-gap">
          <span className="film-label film-grow">{label}</span>
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(tokens[key]) ? tokens[key] : "#000000"}
            onChange={(event) => apply([{ op: "add", path: `/theme/tokens/${key}`, value: event.target.value }])}
            className="film-color"
          />
          <input
            className="film-input film-input-sm film-mono film-w-96"
            defaultValue={tokens[key]}
            onBlur={(event) => apply([{ op: "add", path: `/theme/tokens/${key}`, value: event.target.value }])}
          />
        </div>
      ))}
    </div>
  );
}