/**
 * 图标唯一入口（对应 morph 的 no-restricted-imports / no-inline-svg 规则）。
 * 业务代码禁止直接 import 图标库、禁止写 <svg>；只能从这里取。
 */
import type { SVGProps } from "react";

export type IconName =
  | "play"
  | "pause"
  | "plus"
  | "trash"
  | "settings"
  | "chevron-right"
  | "home"
  | "folder"
  | "sparkle"
  | "library"
  | "bell"
  | "gift"
  | "bolt"
  | "upload"
  | "dots"
  | "search"
  | "undo"
  | "send"
  | "film";

const paths: Record<IconName, string> = {
  play: "M8 5l11 7-11 7V5z",
  pause: "M7 5h4v14H7zM13 5h4v14h-4z",
  plus: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z",
  trash: "M6 7h12l-1 13H7L6 7zm3-2h6l1 2H8l1-2z",
  settings: "M12 8a4 4 0 100 8 4 4 0 000-8zm8 4l-2-1 1-2-2-2-2 1-1-2h-3l-1 2-2-1-2 2 1 2-2 1v3l2 1-1 2 2 2 2-1 1 2h3l1-2 2 1 2-2-1-2 2-1v-3z",
  "chevron-right": "M9 6l6 6-6 6",
  home: "M4 11l8-7 8 7v9a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9z",
  folder: "M4 6h6l2 2h8v11H4V6z",
  sparkle: "M12 4l1.8 4.7L18.5 10l-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.3L12 4z",
  library: "M5 5h5v14H5zM12 5h3v14h-3zM17 7l3 12-2 .5L15 7.5 17 7z",
  bell: "M12 4a5 5 0 015 5v4l2 3H5l2-3V9a5 5 0 015-5zm-1 15a2 2 0 004 0h-4z",
  gift: "M4 11h16v9H4v-9zm0-3h16v3H4V8zm8-3a2.5 2.5 0 012.5 2.5H12V5zm0 0a2.5 2.5 0 00-2.5 2.5H12V5z",
  bolt: "M13 3L5 14h5l-1 7 8-11h-5l1-7z",
  upload: "M12 16V5l-4 4m4-4l4 4M5 19h14",
  dots: "M6 12h.01M12 12h.01M18 12h.01",
  search: "M11 5a6 6 0 104.2 10.2L20 20l-1.4 1.4-4.8-4.8A6 6 0 0111 5z",
  undo: "M4 10h9a5 5 0 010 10h-3M4 10l4-4M4 10l4 4",
  send: "M12 19V5m0 0l-6 6m6-6l6 6",
  film: "M4 5h16v14H4zM4 9h16M4 15h16M8 5v14M16 5v14",
};

export function AppIcon({
  name,
  size = 16,
  ...rest
}: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  );
}
