import { describe, expect, it } from "vitest";
import { parseProjectDoc } from "@/domain/project/schema";
import { buildExportPackage } from "@/server/export/build";
import { crc32, zipSync } from "@/server/export/zip";

const doc = () =>
  parseProjectDoc({
    schemaVersion: "1.0",
    id: "p",
    name: "雨停之后/测试",
    canvas: { width: 1920, height: 1080, safeAreas: [] },
    start: { sceneId: "s1" },
    assets: {
      videos: { a1: { id: "a1", kind: "video", src: "/uploads/demo.mp4", mime: "video/mp4", name: "demo.mp4", size: 10 } },
      images: {},
      audio: {},
      lotties: {},
    },
    scenes: [
      { id: "s1", title: "开场", isStart: true, flow: { kind: "auto", nextSceneId: "s2" } },
      { id: "s2", title: "结局", isEnding: true, flow: { kind: "ending" } },
    ],
  });

describe("ZIP 打包", () => {
  it("crc32 与已知值一致", () => {
    expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926);
  });

  it("生成以 PK 开头的压缩包并带中央目录", () => {
    const bytes = zipSync([{ name: "a.txt", data: Buffer.from("hi") }]);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    const text = Buffer.from(bytes).toString("latin1");
    expect(text).toContain("a.txt");
    expect(text).toContain("PK\u0005\u0006"); // EOCD
  });
});

describe("导出包", () => {
  it("包含 index.html / project.json / manifest.json，且缺素材时给出警告", async () => {
    const result = await buildExportPackage({
      doc: doc(),
      target: "web",
      uploadsDir: "Z:/definitely-not-exists",
      builtAt: "2026-10-28T00:00:00.000Z",
    });
    const text = Buffer.from(result.bytes).toString("latin1");
    expect(text).toContain("index.html");
    expect(text).toContain("project.json");
    expect(text).toContain("manifest.json");
    expect(result.fileName).toMatch(/^雨停之后_测试-web-2026-10-28\.zip$/);
    expect(result.warnings).toHaveLength(1);
    expect(result.manifest).toMatchObject({ target: "web", scenes: 2, assetsCopied: 0, assetsMissing: 1 });
  });

  it("index.html 内嵌数据并含播放器脚本", async () => {
    const result = await buildExportPackage({
      doc: doc(),
      target: "launcher",
      uploadsDir: "Z:/definitely-not-exists",
      builtAt: "2026-10-28T00:00:00.000Z",
    });
    const html = Buffer.from(result.bytes).toString("utf8");
    expect(html).toContain("\"schemaVersion\":\"1.0\"");
    expect(html).toContain("renderScene");
    expect(html).toContain("<title>雨停之后/测试</title>");
  });
});