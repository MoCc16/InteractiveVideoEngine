"use client";

import Link from "next/link";
import { useState } from "react";
import { AppIcon } from "@/components/ui/icons";
import type { ProjectPreview } from "@/domain/project/preview";
import { ProjectThumb } from "./ProjectThumb";
import { formatRelative } from "@/lib/relative-time";

export interface ProjectCardData {
  id: string;
  name: string;
  revision: number;
  updatedAt?: string;
}

function CardMenu({ project }: { project: ProjectCardData }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = async (input: RequestInfo, init: RequestInit) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(input, init);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? `失败（${response.status}）`);
        return;
      }
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  const duplicate = () =>
    call("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fromId: project.id }),
    });

  const rename = () => {
    setOpen(false);
    const next = window.prompt("新的项目名", project.name);
    if (!next || next === project.name) return;
    void call(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ baseRevision: project.revision, ops: [{ op: "replace", path: "/name", value: next }] }),
    });
  };

  const remove = () => {
    setOpen(false);
    if (!window.confirm(`删除「${project.name}」？修订历史会一起删除。`)) return;
    void call(`/api/projects/${project.id}`, { method: "DELETE" });
  };

  return (
    <span className="app-card-menu-wrap">
      <button
        type="button"
        className="app-thumb-menu"
        aria-label="项目操作"
        disabled={busy}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <AppIcon name="dots" size={16} />
      </button>
      {open ? (
        <span className="app-card-menu" role="menu">
          <button type="button" role="menuitem" onClick={duplicate}>
            复制
          </button>
          <button type="button" role="menuitem" onClick={rename}>
            重命名
          </button>
          <button type="button" role="menuitem" className="app-card-menu-danger" onClick={remove}>
            删除
          </button>
        </span>
      ) : null}
      {error ? <span className="app-card-menu-error">{error}</span> : null}
    </span>
  );
}

function NewProjectCard() {
  const [busy, setBusy] = useState(false);

  const create = async () => {
    const name = window.prompt("新项目名", "未命名项目");
    if (!name) return;
    setBusy(true);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (response.ok) {
        const body = (await response.json()) as { project?: { id?: string } };
        const id = body.project?.id;
        if (id) window.location.href = `/v2/project/${id}/graph`;
        else window.location.reload();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className="app-card" disabled={busy} onClick={() => void create()}>
      <div className="app-thumb app-thumb-new">{busy ? "…" : "+"}</div>
      <div className="app-card-title">新建项目</div>
      <div className="app-card-meta">创建新的互动影游项目</div>
    </button>
  );
}

function Thumb({ project, preview }: { project: ProjectCardData; preview?: ProjectPreview }) {
  return (
    <div className="app-thumb-holder">
      {preview ? (
        <ProjectThumb preview={preview} />
      ) : (
        <div className="app-thumb">
          <AppIcon name="film" size={46} className="app-thumb-mark" />
        </div>
      )}
      <CardMenu project={project} />
    </div>
  );
}

/** 项目卡片网格：`+ 新建项目` + 项目卡（缩略图 / 名称 / 编辑时间 / … 菜单） */
export function ProjectGrid({
  projects,
  previews = {},
  showNew = true,
}: {
  projects: ProjectCardData[];
  previews?: Record<string, ProjectPreview>;
  showNew?: boolean;
}) {
  return (
    <div className="app-grid">
      {showNew ? <NewProjectCard /> : null}
      {projects.map((project) => (
        <Link key={project.id} href={`/v2/project/${project.id}/graph`} className="app-card">
          <Thumb project={project} preview={previews[project.id]} />
          <div className="app-card-title">{project.name}</div>
          <div className="app-card-meta">编辑于 {formatRelative(project.updatedAt)}</div>
        </Link>
      ))}
    </div>
  );
}
