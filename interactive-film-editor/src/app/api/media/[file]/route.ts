import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

/**
 * 本地素材网关：
 * - `public/uploads/<file>` 存在 → 直接读本地（支持 Range，视频可拖动）；
 * - 不存在 → 回源到 `FILM_MEDIA_ORIGIN`（默认目标产品），把 Range 一并透传。
 *
 * 之所以需要它：实现示例项目的素材元数据来自目标产品，本地没有文件；
 * 有了这个网关，试玩里的真实视频不需要先把 12MB 素材全下载下来。
 */
const ORIGIN = process.env.FILM_MEDIA_ORIGIN ?? "";

type Params = { params: Promise<{ file: string }> };

function contentType(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".json") return "application/json";
  return "application/octet-stream";
}

function parseRange(header: string | null, size: number): { start: number; end: number } | null {
  if (!header) return null;
  const match = header.match(/bytes=(\d*)-(\d*)/);
  if (!match) return null;
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : size - 1;
  if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) return null;
  return { start, end };
}

export async function GET(req: Request, { params }: Params) {
  const { file } = await params;
  const safe = path.basename(file);
  const localPath = path.join(process.cwd(), "public", "uploads", safe);
  const rangeHeader = req.headers.get("range");

  try {
    const stat = await fs.stat(localPath);
    const bytes = await fs.readFile(localPath);
    const range = parseRange(rangeHeader, stat.size);
    if (!range) {
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          "content-type": contentType(safe),
          "content-length": String(stat.size),
          "accept-ranges": "bytes",
          "cache-control": "public, max-age=60",
        },
      });
    }
    const chunk = bytes.subarray(range.start, range.end + 1);
    return new NextResponse(new Uint8Array(chunk), {
      status: 206,
      headers: {
        "content-type": contentType(safe),
        "content-length": String(chunk.length),
        "accept-ranges": "bytes",
        "content-range": `bytes ${range.start}-${range.end}/${stat.size}`,
      },
    });
  } catch {
    if (!ORIGIN) {
      return NextResponse.json(
        { error: "media_missing", message: `本地没有该素材，且未配置 FILM_MEDIA_ORIGIN：${safe}` },
        { status: 404 },
      );
    }
    // 回源
    try {
      const upstream = await fetch(`${ORIGIN}/uploads/${safe}`, {
        headers: rangeHeader ? { range: rangeHeader } : undefined,
        cache: "no-store",
      });
      if (!upstream.ok && upstream.status !== 206) {
        return NextResponse.json({ error: "media_unavailable", message: `素材不可用：${safe}` }, { status: 404 });
      }
      const headers = new Headers();
      headers.set("content-type", upstream.headers.get("content-type") ?? contentType(safe));
      headers.set("accept-ranges", "bytes");
      const length = upstream.headers.get("content-length");
      if (length) headers.set("content-length", length);
      const contentRange = upstream.headers.get("content-range");
      if (contentRange) headers.set("content-range", contentRange);
      return new NextResponse(upstream.body, { status: upstream.status, headers });
    } catch {
      return NextResponse.json({ error: "media_unreachable", message: "素材回源失败" }, { status: 502 });
    }
  }
}
