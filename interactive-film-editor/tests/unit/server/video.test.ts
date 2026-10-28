import { describe, expect, it } from "vitest";
import { readMp4Duration } from "@/server/assets/repository";
import { parseProjectDoc, type ProjectDoc } from "@/domain/project/schema";
import { createRuntime, reduce } from "@/domain/runtime/state";

/** 构造一个最小 MP4：ftyp + moov/mvhd（v0） */
function buildMp4(timescale: number, duration: number): Buffer {
  const mvhd = Buffer.alloc(8 + 100);
  mvhd.writeUInt32BE(100, 0); // box size
  mvhd.write("mvhd", 4, "ascii");
  mvhd[8] = 0; // version 0
  mvhd.writeUInt32BE(timescale, 8 + 4 + 4 + 4); // base(4)+create(4)+modify(4) → timescale
  mvhd.writeUInt32BE(duration, 8 + 4 + 4 + 4 + 4);

  const moov = Buffer.alloc(8 + mvhd.length);
  moov.writeUInt32BE(8 + mvhd.length, 0);
  moov.write("moov", 4, "ascii");
  mvhd.copy(moov, 8);

  const ftyp = Buffer.alloc(24);
  ftyp.writeUInt32BE(24, 0);
  ftyp.write("ftyp", 4, "ascii");
  ftyp.write("isom", 8, "ascii");

  return Buffer.concat([ftyp, moov]);
}

const doc = (): ProjectDoc =>
  parseProjectDoc({
    schemaVersion: "1.0",
    id: "p",
    name: "video",
    canvas: { width: 1920, height: 1080, safeAreas: [] },
    start: { sceneId: "s1" },
    scenes: [
      {
        id: "s1",
        title: "开场",
        isStart: true,
        video: { assetId: "a1", duration: 2 },
        flow: { kind: "auto", nextSceneId: "s2" },
      },
      { id: "s2", title: "结局", isEnding: true, flow: { kind: "ending" } },
    ],
  });

describe("MP4 时长解析", () => {
  it("读取 mvhd v0 的 timescale/duration", () => {
    expect(readMp4Duration(buildMp4(1000, 5000))).toBeCloseTo(5, 3);
    expect(readMp4Duration(buildMp4(600, 1200))).toBeCloseTo(2, 3);
  });

  it("非 MP4 / 缺少 moov 时返回 null", () => {
    expect(readMp4Duration(Buffer.from("not a video"))).toBeNull();
  });
});

describe("视频结束事件", () => {
  it("auto 节点视频播完后跳到 next", () => {
    const d = doc();
    const state = createRuntime(d);
    expect(state.sceneId).toBe("s1");
    const next = reduce(state, d, { type: "videoEnded" });
    expect(next.sceneId).toBe("s2");
    expect(next.phase).toBe("ending");
  });

  it("非 auto 节点（choice）只记录事件，不跳转", () => {
    const d = parseProjectDoc({
      ...doc(),
      scenes: doc().scenes.map((scene) =>
        scene.id === "s1"
          ? { ...scene, flow: { kind: "choice", choices: [] } }
          : scene,
      ),
    });
    const state = createRuntime(d);
    const next = reduce(state, d, { type: "videoEnded" });
    expect(next.sceneId).toBe("s1");
    expect(next.lastEvent).toContain("视频播放结束");
  });
});
