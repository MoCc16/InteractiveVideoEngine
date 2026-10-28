/**
 * 素材仓库（本地实现）：
 * - 内容寻址：文件名即 sha256，落 `public/uploads/<hash>.<ext>`；
 * - 同哈希自动复用（重复上传不产生新文件，但各自有 asset 记录）；
 * - 记录 width/height（PNG/JPEG 头解析），供画布与时长校正使用。
 */
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ProjectAsset } from "@/domain/project/schema";
import { bucketFor } from "@/domain/project/assets";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const MIME_KIND: Array<{ test: (mime: string) => boolean; kind: ProjectAsset["kind"]; bucket: "videos" | "images" | "audio" | "lotties"; ext: string }> = [
  { test: (m) => m === "video/mp4", kind: "video", bucket: "videos", ext: ".mp4" },
  { test: (m) => m === "image/png", kind: "image", bucket: "images", ext: ".png" },
  { test: (m) => m === "image/jpeg", kind: "image", bucket: "images", ext: ".jpg" },
  { test: (m) => m === "image/webp", kind: "image", bucket: "images", ext: ".webp" },
  { test: (m) => m === "audio/mpeg", kind: "audio", bucket: "audio", ext: ".mp3" },
  { test: (m) => m === "audio/wav" || m === "audio/x-wav", kind: "audio", bucket: "audio", ext: ".wav" },
  { test: (m) => m === "application/json", kind: "lottie", bucket: "lotties", ext: ".json" },
];

export function classifyMime(mime: string) {
  return MIME_KIND.find((item) => item.test(mime)) ?? null;
}

/** 读取 PNG / JPEG 尺寸；未知格式返回空 */
export function readImageSize(bytes: Uint8Array): { width: number; height: number } | null {
  return readPng(bytes) ?? readJpeg(bytes);
}

function readPng(bytes: Uint8Array): { width: number; height: number } | null {
  const signature = [0x89, 0x50, 0x4e, 0x47];
  if (bytes.length <= 24 || !signature.every((byte, index) => bytes[index] === byte)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function readJpeg(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length <= 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1] as number;
    const length = ((bytes[offset + 2] as number) << 8) | (bytes[offset + 3] as number);
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      const height = ((bytes[offset + 5] as number) << 8) | (bytes[offset + 6] as number);
      const width = ((bytes[offset + 7] as number) << 8) | (bytes[offset + 8] as number);
      return { width, height };
    }
    offset += 2 + length;
  }
  return null;
}
/**
 * 解析 MP4/MOV 的 mvhd 时长（秒）。只读盒子头，不依赖 ffmpeg。
 * 找不到 moov/mvhd 时返回 null（分片 MP4 / fMP4 的时长在 sidx 里，另说）。
 */
export function readMp4Duration(bytes: Uint8Array): number | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  const findBox = (start: number, end: number, type: string): { start: number; end: number } | null => {
    let offset = start;
    while (offset + 8 <= end) {
      const size = view.getUint32(offset);
      const boxType = String.fromCharCode(
        bytes[offset + 4] as number,
        bytes[offset + 5] as number,
        bytes[offset + 6] as number,
        bytes[offset + 7] as number,
      );
      if (size < 8) return null;
      const boxEnd = Math.min(offset + size, end);
      if (boxType === type) return { start: offset + 8, end: boxEnd };
      offset = boxEnd;
    }
    return null;
  };

  const moov = findBox(0, bytes.length, "moov");
  if (!moov) return null;
  const mvhd = findBox(moov.start, moov.end, "mvhd");
  if (!mvhd) return null;

  const version = bytes[mvhd.start] as number;
  const base = mvhd.start + 4;
  if (version === 0) {
    // version/flags(4) → creation(4) → modification(4) → timescale(4) → duration(4)
    const timescale = view.getUint32(base + 8);
    const duration = view.getUint32(base + 12);
    return timescale > 0 ? duration / timescale : null;
  }
  const timescale = view.getUint32(base + 16);
  const duration = Number(view.getBigUint64(base + 20));
  return timescale > 0 ? duration / timescale : null;
}

export class AssetRepository {
  constructor(private readonly uploadsDir: string) {}

  async save(input: { name: string; mime: string; bytes: Buffer }): Promise<ProjectAsset> {
    const classified = classifyMime(input.mime);
    if (!classified) throw new Error(`不支持的素材类型：${input.mime}`);
    if (input.bytes.byteLength > MAX_UPLOAD_BYTES) throw new Error("文件超过 50MB 上限");

    const hash = createHash("sha256").update(input.bytes).digest("hex");
    const fileName = `${hash}${classified.ext}`;
    await fs.mkdir(this.uploadsDir, { recursive: true });
    const filePath = path.join(this.uploadsDir, fileName);
    await fs.writeFile(filePath, input.bytes);

    const size = input.bytes.byteLength;
    const dimensions = classified.kind === "image" ? readImageSize(input.bytes) : null;
    const duration = classified.kind === "video" ? readMp4Duration(input.bytes) : null;
    return {
      id: `asset_${hash.slice(0, 12)}`,
      kind: classified.kind,
      src: `/uploads/${fileName}`,
      mime: input.mime,
      hash,
      name: input.name,
      width: dimensions?.width,
      height: dimensions?.height,
      duration: duration ?? undefined,
      size,
      createdAt: new Date().toISOString(),
      tags: [],
    };
  }

  async remove(src: string): Promise<void> {
    const fileName = path.basename(src);
    await fs.rm(path.join(this.uploadsDir, fileName), { force: true });
  }
}

export { bucketFor };
