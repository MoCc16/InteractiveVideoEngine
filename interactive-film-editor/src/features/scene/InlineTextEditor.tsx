"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Box } from "@/domain/project/anchor";

/** 画布内联改字：双击文本元件后出现，Enter 提交、Esc 取消 */
export function InlineTextEditor({
  box,
  scale,
  value,
  onCommit,
  onCancel,
}: {
  box: Box;
  scale: number;
  value: string;
  onCommit: (next: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      className="film-inline-text"
      style={
        {
          "--tx": box.x,
          "--ty": box.y,
          "--tw": box.width,
          "--th": box.height,
          "--tf": Math.max(12, box.height / scale / 3),
        } as CSSProperties
      }
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit(draft);
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
    />
  );
}