#!/usr/bin/env node
/**
 * V0 · 从目标产品 CSS 提取设计系统（可复现）。
 *
 * 输入：`TARGET_CSS_DIR`（默认 _rea/web/assets）里的 index-*.css 与 fonts-*.css
 * 输出：`design/design-tokens.json`
 *   - rootVariables：目标产品 :root 里的全部自定义属性（原名原值）
 *   - colors：hex/rgba 频次（取前 60）
 *   - radii / fontSizes / controlHeights / paddings：频次
 *   - glass：backdrop-filter 配方频次
 *   - fonts：@font-face 家族与引用方式
 *   - shadows：box-shadow 频次
 *
 * 目的：样式层不再"凭感觉编"，而是有据可查地映射到 morph 命名。
 */
import fs from "node:fs";
import path from "node:path";

const dir = process.env.TARGET_CSS_DIR ?? path.join(process.cwd(), "..", "_rea", "web", "assets");
const outDir = path.join(process.cwd(), "design");

function readIfExists(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.endsWith(".css")) : [];
const mainName = files.find((name) => name.startsWith("index-")) ?? files[0];
const fontName = files.find((name) => name.startsWith("fonts-")) ?? "";
const main = readIfExists(path.join(dir, mainName));
const fontsCss = readIfExists(path.join(dir, fontName));

const counter = (items) => {
  const map = new Map();
  for (const item of items) map.set(item, (map.get(item) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
};

const rootMatch = main.match(/:root\s*{([^}]*)}/);
const rootVariables = {};
for (const decl of (rootMatch?.[1] ?? "").split(";")) {
  const match = decl.match(/^\s*(--[\w-]+)\s*:\s*(.+?)\s*$/);
  if (match) rootVariables[match[1]] = match[2];
}

const grab = (pattern) => [...main.matchAll(pattern)].map((m) => (m[1] ?? m[0]).trim());

const report = {
  source: { dir, files, mainCss: mainName, fontCss: fontName, chars: main.length },
  rootVariables,
  colors: {
    hex: counter(grab(/background(?:-color)?\s*:\s*(#[0-9a-fA-F]{3,8})/g)).slice(0, 30),
    rgba: counter(grab(/background(?:-color)?\s*:\s*(rgba?\([^)]*\))/g)).slice(0, 30),
    allHexUnique: new Set(main.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).size,
  },
  fontSizes: counter(grab(/font-size\s*:\s*([\d.]+px)/g)).slice(0, 20),
  radii: counter(grab(/border-radius\s*:\s*([^;}]+)/g)).slice(0, 20),
  controlHeights: counter(grab(/height\s*:\s*(\d+px)/g)).slice(0, 20),
  paddings: counter(grab(/padding\s*:\s*([^;}]+)/g)).slice(0, 20),
  glass: counter(grab(/backdrop-filter\s*:\s*([^;}]+)/g)).slice(0, 15),
  shadows: counter(grab(/box-shadow\s*:\s*([^;}]+)/g)).slice(0, 20),
  fonts: {
    faceCount: (fontsCss.match(/@font-face/g) ?? []).length,
    families: counter(grab(/font-family\s*:\s*([^;}]+)/g)).slice(0, 20),
    embeddedBase64Faces: (fontsCss.match(/data:font\/woff2/g) ?? []).length,
    remoteUrls: (fontsCss.match(/url\(\/assets\//g) ?? []).length,
  },
};

fs.mkdirSync(outDir, { recursive: true });
const target = path.join(outDir, "design-tokens.json");
fs.writeFileSync(target, JSON.stringify(report, null, 2), "utf8");
console.log(`tokens → ${path.relative(process.cwd(), target)}`);
console.log(`root vars: ${Object.keys(rootVariables).length} | hex: ${report.colors.allHexUnique} | faces: ${report.fonts.faceCount}`);
