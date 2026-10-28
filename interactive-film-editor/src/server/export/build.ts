import { promises as fs } from "node:fs";
import path from "node:path";
import type { ProjectDoc } from "@/domain/project/schema";
import { computeQuote, type ExportTarget } from "@/domain/project/export";
import { buildPlayerHtml } from "./player-html";
import { zipSync, type ZipEntry } from "./zip";

export interface BuildOptions {
  doc: ProjectDoc;
  target: ExportTarget;
  uploadsDir: string;
  builtAt?: string;
}

export interface BuildResult {
  fileName: string;
  bytes: Uint8Array;
  manifest: Record<string, unknown>;
  warnings: string[];
}

function safeName(name: string): string {
  const base = name.replace(/[\\/:*?"<>|]+/g, "_").trim() || "project";
  return base.slice(0, 60);
}

function collectAssets(doc: ProjectDoc): Array<{ id: string; file: string; kind: string }> {
  const groups: Array<[string, Record<string, { src?: string }> | undefined]> = [
    ["video", doc.assets?.videos],
    ["image", doc.assets?.images],
    ["audio", doc.assets?.audio],
    ["lottie", doc.assets?.lotties],
  ];
  const list: Array<{ id: string; file: string; kind: string }> = [];
  for (const [kind, group] of groups) {
    for (const [id, asset] of Object.entries(group ?? {})) {
      const file = asset?.src?.split("/").pop();
      if (file) list.push({ id, file, kind });
    }
  }
  return list;
}

/** 构建导出包：index.html（内嵌数据 + 播放器）+ project.json + assets/ + manifest.json */
export async function buildExportPackage(options: BuildOptions): Promise<BuildResult> {
  const { doc, target, uploadsDir } = options;
  const builtAt = options.builtAt ?? new Date().toISOString();
  const warnings: string[] = [];
  const entries: ZipEntry[] = [];

  entries.push({ name: "index.html", data: Buffer.from(buildPlayerHtml(doc), "utf8") });
  entries.push({ name: "project.json", data: Buffer.from(JSON.stringify(doc, null, 2), "utf8") });
  entries.push({
    name: "README.txt",
    data: Buffer.from(
      [
        `${doc.name} · 导出包（${target}）`,
        "",
        "双击 index.html 即可播放（素材在同目录 assets/ 下，需一起分发）。",
        "project.json 是完整工程数据，可用编辑器再次导入。",
      ].join("\n"),
      "utf8",
    ),
  });

  let copied = 0;
  for (const asset of collectAssets(doc)) {
    const filePath = path.join(uploadsDir, asset.file);
    try {
      const bytes = await fs.readFile(filePath);
      entries.push({ name: `assets/${asset.file}`, data: bytes });
      copied += 1;
    } catch {
      warnings.push(`素材文件缺失：${asset.kind}/${asset.file}（无法从目标产品回源，导出包里会缺这张图/这段视频）`);
    }
  }

  const quote = computeQuote(doc, target);
  const manifest = {
    projectId: doc.id,
    name: doc.name,
    schemaVersion: doc.schemaVersion,
    target,
    builtAt,
    canvas: doc.canvas,
    scenes: doc.scenes.length,
    chapters: doc.chapters.length,
    variables: doc.variables.length,
    assetsCopied: copied,
    assetsMissing: warnings.length,
    billableNodes: quote.billableNodes,
    credits: quote.finalPrice,
    warnings,
  };
  entries.push({ name: "manifest.json", data: Buffer.from(JSON.stringify(manifest, null, 2), "utf8") });

  return {
    fileName: `${safeName(doc.name)}-${target}-${builtAt.slice(0, 10)}.zip`,
    bytes: zipSync(entries),
    manifest,
    warnings,
  };
}