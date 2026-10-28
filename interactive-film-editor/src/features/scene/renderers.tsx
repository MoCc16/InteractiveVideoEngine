"use client";

import type { ReactNode } from "react";
import type { Component } from "@/domain/project/schema";
import { StoryMapGlyph } from "@/components/ui/graph/StoryMapGlyph";

/** 成品元件皮肤：画布坐标（1920 宽）下的视觉，尺寸仍由锚点决定 */

function Player() {
  return (
    <div className="film-c film-c-player">
      <span className="film-c-player-icon">▶</span>
      <span className="film-c-player-track">
        <span className="film-c-player-fill" />
      </span>
      <span className="film-c-player-time">0:03 / 0:12</span>
      <span className="film-c-player-tools">1x ⚙ ☰</span>
    </div>
  );
}

function Choices({ hud }: { hud?: boolean }) {
  return (
    <div className="film-c film-c-choices">
      {["选项 1", "选项 2"].map((label) => (
        <div key={label} className={`film-c-choice${hud ? " film-c-choice-hud" : ""}`}>
          {label}
        </div>
      ))}
    </div>
  );
}

function Menu() {
  return (
    <div className="film-c film-c-menu">
      {["开始游戏", "继续", "设置"].map((label, index) => (
        <span key={label} className={`film-c-menu-item${index === 0 ? " film-c-menu-item-active" : ""}`}>
          {label}
        </span>
      ))}
    </div>
  );
}

function Chapters() {
  return (
    <div className="film-c film-c-chapters">
      {["第一章", "第二章", "第三章"].map((label, index) => (
        <div key={label} className={`film-c-chapter-row${index > 0 ? " film-c-chapter-row-locked" : ""}`}>
          <span>
            {String(index + 1).padStart(2, "0")} · {label}
          </span>
          <span className="film-c-chapter-meta">{index === 0 ? "进行中" : "未解锁"}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressCard() {
  return (
    <div className="film-c film-c-progress">
      <span className="film-c-progress-label">进度</span>
      <span className="film-c-progress-chapter">第一章</span>
      <span className="film-c-progress-track">
        <span className="film-c-progress-fill" />
      </span>
    </div>
  );
}

function ChapterTitle() {
  return (
    <div className="film-c film-c-chapter-title">
      <span className="film-c-chapter-title-text">第一章</span>
      <span className="film-c-chapter-title-rule" />
    </div>
  );
}

function Splash() {
  return (
    <div className="film-c film-c-splash">
      <span className="film-c-splash-title">作品标题</span>
      <span className="film-c-splash-sub">每一次选择，都在书写不同的结局</span>
      <span className="film-c-splash-start">开始</span>
    </div>
  );
}

function Pill({ label }: { label: string }) {
  return <div className="film-c film-c-pill">{label}</div>;
}

function QteHandle({ gold }: { gold?: boolean }) {
  return (
    <div className="film-c film-c-qte">
      <span className={`film-c-qte-ring${gold ? " film-c-qte-gold" : ""}`}>QTE</span>
    </div>
  );
}

function Media({ kind, src }: { kind: "video" | "image"; src?: string }) {
  if (!src) {
    return <div className="film-c-media-fallback">{kind === "video" ? "视频未绑定" : "图片未绑定"}</div>;
  }
  if (kind === "image") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="film-c-media" src={src} alt="" />;
  }
  return <video className="film-c-media" src={src} muted playsInline preload="metadata" />;
}

function Ornament() {
  return (
    <div className="film-c film-c-ornament">
      <span className="film-c-ornament-line" />
      <span className="film-c-ornament-dot" />
    </div>
  );
}

function Hint() {
  return <div className="film-c film-c-hint">线索：她在雨里回头的那一眼</div>;
}

function Achievements() {
  const items = [
    { badge: "01", label: "真结局 · 雨停之后" },
    { badge: "02", label: "隐藏线索 · 旧车票" },
  ];
  return (
    <div className="film-c film-c-achievements">
      {items.map((item) => (
        <div key={item.badge} className="film-c-achievement">
          <span className="film-c-achievement-badge">{item.badge}</span>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function StoryMap() {
  return (
    <div className="film-c film-c-storymap">
      <StoryMapGlyph />
    </div>
  );
}
function StoryProgress() {
  return (
    <div className="film-c film-c-storyprogress">
      <span className="film-c-progress-label">探索</span>
      <span className="film-c-storyprogress-track">
        <span className="film-c-storyprogress-fill" />
      </span>
      <span className="film-c-progress-label">48%</span>
    </div>
  );
}

function Speed() {
  return (
    <div className="film-c film-c-speed">
      <span>0.5x</span>
      <span className="film-c-speed-active">1x</span>
      <span>1.5x</span>
      <span>2x</span>
    </div>
  );
}

function Volume() {
  return (
    <div className="film-c film-c-volume">
      <span className="film-c-player-icon">♪</span>
      <span className="film-c-volume-track">
        <span className="film-c-volume-thumb" />
      </span>
    </div>
  );
}

function Close() {
  return <div className="film-c film-c-close">✕</div>;
}

function Typewriter({ text }: { text: string }) {
  return (
    <div className="film-c film-c-typewriter">
      <span>{text}</span>
      <span className="film-c-caret" />
    </div>
  );
}

function variantOf(component: Component): string {
  const raw = (component.style as Record<string, unknown> | undefined)?.variant;
  if (raw && typeof raw === "object") {
    const value = (raw as { value?: unknown }).value;
    return typeof value === "string" ? value : "";
  }
  return "";
}

function literalOf(component: Component): string {
  const content = component.content;
  return content?.kind === "literal" ? String(content.value ?? "") : "";
}

type PreviewCtx = { component: Component; resolveAsset?: (id: string) => string | undefined };

function mediaSrc(component: Component, resolveAsset?: (id: string) => string | undefined): string | undefined {
  const id = literalOf(component);
  return id && resolveAsset ? resolveAsset(id) : undefined;
}

const PREVIEWS: Record<string, (ctx: PreviewCtx) => ReactNode> = {
  video: ({ component, resolveAsset }) => <Media kind="video" src={mediaSrc(component, resolveAsset)} />,
  image: ({ component, resolveAsset }) => <Media kind="image" src={mediaSrc(component, resolveAsset)} />,
  videoPlayer: () => <Player />,
  choiceList: ({ component }) => <Choices hud={variantOf(component) === "hud"} />,
  mainMenu: () => <Menu />,
  navMenu: () => <Menu />,
  chapterListView: () => <Chapters />,
  mobileProgressBar: () => <ProgressCard />,
  progressPreview: () => <ProgressCard />,
  chapterTitle: () => <ChapterTitle />,
  splashScreen: () => <Splash />,
  endingButton: () => <Pill label="重新开始" />,
  actionButton: () => <Pill label="动作" />,
  endingOrnament: () => <Ornament />,
  endingHint: () => <Hint />,
  settlementAchievements: () => <Achievements />,
  storyMap: () => <StoryMap />,
  storyProgress: () => <StoryProgress />,
  speedSelector: () => <Speed />,
  volumeSlider: () => <Volume />,
  panelCloseButton: () => <Close />,
  typewriterText: ({ component }) => <Typewriter text={literalOf(component) || "雨声渐起，她转过身来"} />,
  qteHandle: () => <QteHandle />,
  qteGoldHandle: () => <QteHandle gold />,
  atmosphericOverlay: () => <div className="film-c film-c-atmosphere" />,
};

export function ComponentPreview({ component, resolveAsset }: PreviewCtx): ReactNode {
  const renderer = PREVIEWS[component.type];
  return renderer ? renderer({ component, resolveAsset }) : null;
}
export const HAS_CUSTOM_PREVIEW = new Set([
  "video",
  "image",
  "videoPlayer",
  "choiceList",
  "mainMenu",
  "navMenu",
  "chapterListView",
  "mobileProgressBar",
  "progressPreview",
  "chapterTitle",
  "splashScreen",
  "endingButton",
  "actionButton",
  "endingOrnament",
  "endingHint",
  "settlementAchievements",
  "storyMap",
  "storyProgress",
  "speedSelector",
  "volumeSlider",
  "panelCloseButton",
  "typewriterText",
  "qteHandle",
  "qteGoldHandle",
  "atmosphericOverlay",
]);