"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { t } from "@/i18n/film-messages";

function useRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const refresh = () => start(() => router.refresh());
  return { refresh, pending };
}

/** 行内操作：复制 / 重命名 / 删除 */
export function ProjectRowActions({
  id,
  name,
  revision,
}: {
  id: string;
  name: string;
  revision: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useRefresh();

  const call = async (input: RequestInfo, init: RequestInit) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(input, init);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? `失败（${response.status}）`);
        return false;
      }
      refresh();
      return true;
    } finally {
      setBusy(false);
    }
  };

  const duplicate = () =>
    call("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fromId: id, name: t("projects.copySuffix", { name }) }),
    });

  const rename = () => {
    const next = window.prompt(t("common.rename"), name);
    if (!next || next === name) return;
    void call(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ baseRevision: revision, ops: [{ op: "replace", path: "/name", value: next }] }),
    });
  };

  const remove = () => {
    if (!window.confirm(`删除「${name}」？修订历史会一起删除，无法恢复。`)) return;
    void call(`/api/projects/${id}`, { method: "DELETE" });
  };

  return (
    <div className="film-row-gap">
      <button type="button" className="film-btn" disabled={busy} onClick={() => void duplicate()}>
        复制
      </button>
      <button type="button" className="film-btn" disabled={busy} onClick={rename}>
        重命名
      </button>
      <button type="button" className="film-btn film-btn-danger" disabled={busy} onClick={remove}>
        删除
      </button>
      {error ? <span className="film-label film-danger">{error}</span> : null}
    </div>
  );
}
