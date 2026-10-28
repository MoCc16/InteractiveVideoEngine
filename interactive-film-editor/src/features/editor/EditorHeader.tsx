"use client";

import Link from "next/link";
import { AppIcon } from "@/components/ui/icons";
import { t } from "@/i18n/film-messages";
import { useEditor } from "./EditorProvider";

const STATUS_TEXT: Record<string, string> = {
  saved: t("editor.status.saved"),
  dirty: t("editor.status.dirty"),
  saving: t("editor.status.saving"),
  error: t("editor.status.error"),
};

const STATUS_CLASS: Record<string, string> = {
  saved: "ed-status",
  dirty: "ed-status ed-status-dirty",
  saving: "ed-status",
  error: "ed-status ed-status-error",
};

export function EditorHeader() {
  const { doc, revision, status, error, canUndo, canRedo, undo, redo, save, apply, dirtyCount } = useEditor();

  return (
    <header className="ed-topbar">
      <Link href="/projects" className="ed-back">
        <span className="ed-back-icon">
          <AppIcon name="chevron-right" size={14} />
        </span>
        <span className="ed-crumb">/</span>
        <input
          aria-label={t("editor.projectName")}
          className="film-input-title"
          defaultValue={doc.name}
          onBlur={(event) => {
            const next = event.target.value.trim();
            if (next && next !== doc.name) apply([{ op: "replace", path: "/name", value: next }]);
          }}
        />
      </Link>

      <span className={STATUS_CLASS[status]}>
        {STATUS_TEXT[status]}
        {error ? ` · ${error}` : ""}
        {dirtyCount > 0 ? ` · ${t("editor.pending", { count: dirtyCount })}` : ""}
      </span>

      <div className="ed-topbar-right">
        <span className="ed-status">{t("editor.revision", { revision })}</span>
        <button type="button" className="app-icon-btn" aria-label={t("editor.undo")} disabled={!canUndo} onClick={undo}>
          <AppIcon name="undo" size={16} />
        </button>
        <button
          type="button"
          className="app-icon-btn"
          aria-label={t("editor.redo")}
          disabled={!canRedo}
          onClick={redo}
        >
          <AppIcon name="chevron-right" size={16} />
        </button>
        <button
          type="button"
          className="film-btn film-btn-primary"
          onClick={() => void save()}
          disabled={status === "saving" || dirtyCount === 0}
        >
          {t("common.save")}
        </button>
      </div>
    </header>
  );
}