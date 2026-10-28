import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseProjectDoc, type ProjectDoc } from "@/domain/project/schema";
import { countAssetUsage, findAssetReferences } from "@/domain/project/references";
import { billableNodes, computeAllQuotes, computeQuote, PRICE_PER_NODE } from "@/domain/project/export";
import { readImageSize } from "@/server/assets/repository";

const fixture = (name: string) =>
  parseProjectDoc(
    JSON.parse(readFileSync(path.join(process.cwd(), "tests", "fixtures", name), "utf8")) as unknown,
  );

function docWithRefs(): ProjectDoc {
  return parseProjectDoc({
    schemaVersion: "1.0",
    id: "p",
    name: "refs",
    canvas: { width: 1920, height: 1080, safeAreas: [] },
    start: { sceneId: "s1" },
    splash: { enabled: true, title: "T", startLabel: "开始", bgImageAssetId: "asset_bg" },
    audio: { bgmAssetId: "asset_bgm", sfx: {} },
    chapters: [{ id: "ch1", name: "第一章", isFirst: true, enabled: true, coverAssetId: "asset_cover" }],
    scenes: [
      { id: "s1", title: "开场", isStart: true, video: { assetId: "asset_video", duration: 3 }, posterAssetId: "asset_poster", flow: { kind: "auto" } },
    ],
    layouts: {
      shared: [
        {
          id: "lay1",
          root: {
            id: "root",
            type: "group",
            children: [{ id: "img1", type: "image", content: { kind: "literal", value: "asset_img" } }],
          },
        },
      ],
      bindings: {},
    },
    assets: {
      videos: { asset_video: { id: "asset_video", kind: "video", src: "/uploads/v.mp4", mime: "video/mp4", name: "v.mp4", size: 10, tags: [] } },
      images: {},
      audio: {},
      lotties: {},
    },
  });
}

describe("素材引用扫描", () => {
  it("能找出 splash / bgm / 章节封面 / 节点视频 / 预览图 / 版式元件里的引用", () => {
    const doc = docWithRefs();
    expect(findAssetReferences(doc, "asset_bg")[0]?.path).toBe("/splash/bgImageAssetId");
    expect(findAssetReferences(doc, "asset_bgm")[0]?.path).toBe("/audio/bgmAssetId");
    expect(findAssetReferences(doc, "asset_cover")[0]?.path).toBe("/chapters/0/coverAssetId");
    expect(findAssetReferences(doc, "asset_video")[0]?.path).toBe("/scenes/0/video/assetId");
    expect(findAssetReferences(doc, "asset_poster")[0]?.path).toBe("/scenes/0/posterAssetId");
    expect(findAssetReferences(doc, "asset_img")[0]?.label).toContain("img1");
  });

  it("未被引用的素材返回空（可删除）", () => {
    expect(findAssetReferences(docWithRefs(), "asset_unused")).toEqual([]);
    expect(countAssetUsage(docWithRefs(), "asset_unused")).toBe(0);
    expect(countAssetUsage(docWithRefs(), "asset_video")).toBe(1);
  });

  it("真实项目里统计与引用一致", () => {
    const doc = fixture("project-minimal.json");
    const firstVideo = Object.keys(doc.assets?.videos ?? {})[0];
    expect(firstVideo).toBeTruthy();
    if (!firstVideo) return;
    expect(findAssetReferences(doc, firstVideo).length).toBe(countAssetUsage(doc, firstVideo));
  });
});

describe("导出报价", () => {
  const doc = fixture("project-minimal.json");

  it("按节点数计费（9 节点 = 1800）", () => {
    expect(billableNodes(doc)).toBe(doc.scenes.length);
    const quote = computeQuote(doc, "web");
    expect(quote.finalPrice).toBe(doc.scenes.length * PRICE_PER_NODE);
    expect(quote.discountApplied).toBe(false);
  });

  it("网页版/桌面版同组：第二个起 5 折；安卓独立基线不打折", () => {
    const quotes = computeAllQuotes(doc);
    const byTarget = Object.fromEntries(quotes.map((quote) => [quote.target, quote]));
    expect(byTarget.web?.discountApplied).toBe(false);
    expect(byTarget.launcher?.discountApplied).toBe(true);
    expect(byTarget.launcher?.finalPrice).toBe(Math.round((doc.scenes.length * PRICE_PER_NODE) / 2));
    expect(byTarget.apk?.discountApplied).toBe(false);
  });
});

describe("图片尺寸解析", () => {
  it("读 PNG 头（IHDR 宽高）", () => {
    const bytes = Buffer.alloc(32);
    bytes[0] = 0x89;
    bytes[1] = 0x50;
    bytes[2] = 0x4e;
    bytes[3] = 0x47;
    bytes.writeUInt32BE(96, 16);
    bytes.writeUInt32BE(64, 20);
    expect(readImageSize(bytes)).toEqual({ width: 96, height: 64 });
  });

  it("非图片返回 null", () => {
    expect(readImageSize(Buffer.from("hello world"))).toBeNull();
  });
});
