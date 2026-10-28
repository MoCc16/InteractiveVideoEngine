#!/usr/bin/env node
/**
 * 实现内联视觉原语守卫（对齐 morph 的 tsx-inline-visual-primitive-guard）。
 *
 * 规则：`style={{ ... }}` 对象字面量里出现排版/间距/尺寸类原始属性即视为违规；
 * 数据驱动的几何样式（left/top/width/height 来自锚点计算）在画布目录里豁免。
 *
 * 用法：node scripts/check-inline-primitives.mjs [--json] [--strict]（默认只报告，--strict 才失败）
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SCAN_ROOTS = ["src"];
const EXCLUDED_SEGMENTS = [
  // 画布/舞台：left/top/width/height 由锚点计算得出，必须内联
  "/features/scene/SceneCanvas.tsx",
  "/features/play/PlayStage.tsx",
  "/features/story-graph/StoryGraphView.tsx",
  "/components/ui/graph/EdgeLayer.tsx",
];

const GUARDED = new Set([
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "gap",
  "rowGap",
  "columnGap",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      walk(full, out);
    } else if (entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

function isExcluded(rel) {
  const posix = "/" + rel.split(path.sep).join("/");
  return EXCLUDED_SEGMENTS.some((segment) => posix.includes(segment));
}

/** 粗略但稳定的判定：找 style={{ ... }} 块，统计块内的受控属性名 */
function findViolations(source) {
  const violations = [];
  const styleStart = /style=\{\{/g;
  let match;
  while ((match = styleStart.exec(source)) !== null) {
    const start = match.index;
    let depth = 0;
    let index = start + "style=".length;
    for (; index < source.length; index += 1) {
      const char = source[index];
      if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    const block = source.slice(start, index + 1);
    for (const property of GUARDED) {
      if (new RegExp(`(^|[^A-Za-z])${property}\\s*:`).test(block)) {
        const line = source.slice(0, start).split("\n").length;
        violations.push({ property, line });
        break;
      }
    }
  }
  return violations;
}

const files = SCAN_ROOTS.flatMap((root) => walk(path.join(ROOT, root)));
const report = [];
for (const file of files) {
  const rel = path.relative(ROOT, file);
  if (isExcluded(rel)) continue;
  const source = fs.readFileSync(file, "utf8");
  const violations = findViolations(source);
  if (violations.length > 0) report.push({ file: rel, count: violations.length, lines: violations.map((v) => v.line) });
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else if (report.length === 0) {
  console.log("inline-primitives: 通过（0 处）");
} else {
  console.log(`inline-primitives: ${report.length} 个文件存在内联视觉原语`);
  for (const entry of report.sort((a, b) => b.count - a.count)) {
    console.log(`  ${entry.file}  ×${entry.count}  (行 ${entry.lines.slice(0, 6).join(", ")})`);
  }
  if (process.argv.includes("--strict")) process.exitCode = 1;
}
