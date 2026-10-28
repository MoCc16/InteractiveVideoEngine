import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/film/tokens.css";
import "@/styles/film/ui.css";
import "@/styles/film/shell.css";

export const metadata: Metadata = {
  title: "Interactive Film Editor",
  description: "互动影游可视化编辑器",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="film-body app-body">{children}</body>
    </html>
  );
}