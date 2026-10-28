"use client";

import type { CSSProperties, ReactNode } from "react";
import { resolveBox, type Box } from "@/domain/project/anchor";
import type { Component, ProjectDoc, ProjectLayout, Scene } from "@/domain/project/schema";
import { resolveStyle, type StyleContext } from "@/domain/project/style";
import { ComponentPreview, HAS_CUSTOM_PREVIEW } from "@/features/scene/renderers";
import { componentSpec } from "@/features/scene/registry";

function textOf(component: Component): string | null {
  const content = component.content;
  if (!content) return null;
  if (content.kind === "binding") return `{${content.expr ?? ""}}`;
  if (content.kind === "literal") return String(content.value ?? "");
  return null;
}

function styleFor(component: Component, box: Box, ctx: StyleContext): CSSProperties {
  const style = resolveStyle(component, ctx);
  const isGroup = component.type === "group";
  return {
    position: "absolute",
    left: box.x,
    top: box.y,
    width: box.width,
    height: box.height,
    boxSizing: "border-box",
    zIndex: component.z ?? 0,
    opacity: style.opacity,
    display: "flex",
    flexDirection: "column",
    alignItems: style.textAlign === "center" ? "center" : style.textAlign === "right" ? "flex-end" : "flex-start",
    justifyContent: isGroup ? "flex-start" : "center",
    textAlign: style.textAlign,
    padding: style.padding,
    borderStyle: isGroup ? "dashed" : "solid",
    borderWidth: isGroup ? 0 : style.borderWidth,
    borderColor: style.borderColor,
    borderRadius: style.borderRadius,
    background: style.backgroundColor,
    color: style.color,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    boxShadow: style.boxShadow,
    overflow: "hidden",
    whiteSpace: style.whiteSpace,
    textOverflow: "ellipsis",
  };
}

function renderComponent(
  component: Component,
  parentBox: Box,
  ctx: StyleContext,
  resolveAsset?: (id: string) => string | undefined,
): ReactNode {
  const spec = componentSpec(component.type);
  const box = resolveBox(component, parentBox, { autoWidth: spec.autoWidth, autoHeight: spec.autoHeight });
  const preview = HAS_CUSTOM_PREVIEW.has(component.type) ? (
      <ComponentPreview component={component} resolveAsset={resolveAsset} />
    ) : null;
  const text = textOf(component);
  const ordered = (component.children ?? [])
    .map((child, index) => ({ child, index }))
    .sort((a, b) => (a.child.z ?? 0) - (b.child.z ?? 0) || a.index - b.index);

  return (
    <div key={component.id} style={styleFor(component, box, ctx)}>
      {component.type === "group" ? null : preview ?? (
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{text ?? spec.placeholder}</span>
      )}
      {ordered.map(({ child }) => renderComponent(child, box, ctx, resolveAsset))}
    </div>
  );
}

/** 只渲染一棵版式树（不含视频层/叠层），供舞台与换皮面板复用 */
export function LayoutView({
  layout,
  ctx,
  width,
  height,
  resolveAsset,
}: {
  layout: ProjectLayout;
  ctx: StyleContext;
  width: number;
  height: number;
  resolveAsset?: (id: string) => string | undefined;
}) {
  const rootBox: Box = { x: 0, y: 0, width, height };
  return <>{renderComponent(layout.root, rootBox, ctx, resolveAsset)}</>;
}

export interface PlayStageProps {
  doc: ProjectDoc;
  scene: Scene | undefined;
  ctx: StyleContext;
  overlay?: ReactNode;
  videoSrc?: string;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  videoLoop?: boolean;
  onVideoEnded?: () => void;
}

/** 播放画布：视频层 + 当前场景版式 + 叠层 */
export function PlayStage({ doc, scene, ctx, overlay, videoSrc, videoRef, videoLoop, onVideoEnded }: PlayStageProps) {
  const layout = doc.layouts?.shared.find((item) => item.id === scene?.layoutId) ?? doc.layouts?.shared[0];

  return (
    <div
      style={{
        position: "relative",
        width: doc.canvas.width,
        height: doc.canvas.height,
        background: ctx.theme.background,
        color: ctx.theme.text,
        overflow: "hidden",
      }}
    >
      {videoSrc ? (
        <video
          ref={videoRef}
          className="film-video-layer"
          src={videoSrc}
          muted
          playsInline
          loop={videoLoop}
          onEnded={onVideoEnded}
        />
      ) : (
        <div className="film-video-empty">该节点未绑定视频</div>
      )}
      {layout ? (
        <LayoutView
          layout={layout}
          ctx={ctx}
          width={doc.canvas.width}
          height={doc.canvas.height}
          resolveAsset={(id) =>
            doc.assets?.videos?.[id]?.src ?? doc.assets?.images?.[id]?.src ?? doc.assets?.audio?.[id]?.src
          }
        />
      ) : null}
      {overlay}
    </div>
  );
}