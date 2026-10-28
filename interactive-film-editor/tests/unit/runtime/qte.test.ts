import { describe, expect, it } from "vitest";
import { parseProjectDoc, type ProjectDoc } from "@/domain/project/schema";
import { createRuntime, reduce, type RuntimeState } from "@/domain/runtime/state";

function docWith(qte: Record<string, unknown>): ProjectDoc {
  return parseProjectDoc({
    schemaVersion: "1.0",
    id: "p",
    name: "qte",
    canvas: { width: 1920, height: 1080, safeAreas: [] },
    start: { sceneId: "q" },
    scenes: [
      {
        id: "q",
        title: "QTE",
        isStart: true,
        flow: {
          kind: "qte",
          qtes: [{ id: "a1", startSec: 0, endSec: 3, onSuccess: { nextSceneId: "ok" }, onFail: { nextSceneId: "bad" }, ...qte }],
        },
      },
      { id: "ok", title: "成功", flow: { kind: "ending" }, isEnding: true },
      { id: "bad", title: "失败", flow: { kind: "ending" }, isEnding: true },
    ],
  });
}

const tap = (state: RuntimeState, doc: ProjectDoc) => reduce(state, doc, { type: "qteInput", input: { kind: "tap" } });
const at = (state: RuntimeState, doc: ProjectDoc, seconds: number) =>
  reduce(state, doc, { type: "tick", dt: seconds - state.elapsed });

describe("QTE 手势判定", () => {
  it("tap：按满 required 次才成功", () => {
    const d = docWith({ kind: "tap", required: 2 });
    let s = at(createRuntime(d), d, 0.5);
    s = tap(s, d);
    expect(s.sceneId).toBe("q");
    expect(s.qteHits).toBe(1);
    s = tap(s, d);
    expect(s.sceneId).toBe("ok");
    expect(s.qteFeedback).toBe("success");
  });

  it("mash：用 threshold 作为蓄力阈值", () => {
    const d = docWith({ kind: "mash", threshold: 3 });
    let s = at(createRuntime(d), d, 0.2);
    s = tap(s, d);
    s = tap(s, d);
    expect(s.sceneId).toBe("q");
    s = tap(s, d);
    expect(s.sceneId).toBe("ok");
  });

  it("direction：方向一致成功，不一致失败", () => {
    const up = docWith({ kind: "direction", direction: "up" });
    const ok = reduce(at(createRuntime(up), up, 0.5), up, { type: "qteInput", input: { kind: "direction", direction: "up" } });
    expect(ok.sceneId).toBe("ok");

    const down = reduce(at(createRuntime(up), up, 0.5), up, { type: "qteInput", input: { kind: "direction", direction: "down" } });
    expect(down.sceneId).toBe("bad");
    expect(down.qteFeedback).toBe("fail");
  });

  it("direction=free：任意方向都成功", () => {
    const d = docWith({ kind: "direction", direction: "free" });
    const s = reduce(at(createRuntime(d), d, 0.5), d, { type: "qteInput", input: { kind: "direction", direction: "left" } });
    expect(s.sceneId).toBe("ok");
  });

  it("timing：与 defaultChoiceId 一致成功，否则失败", () => {
    const d = docWith({
      kind: "timing",
      durationSec: 1,
      defaultChoiceId: "c1",
      choices: [
        { id: "c1", label: "现在", atSec: 0.5 },
        { id: "c2", label: "等待", atSec: 0.8 },
      ],
    });
    const hit = reduce(at(createRuntime(d), d, 0.6), d, { type: "qteInput", input: { kind: "choice", choiceId: "c1" } });
    expect(hit.sceneId).toBe("ok");

    const miss = reduce(at(createRuntime(d), d, 0.9), d, { type: "qteInput", input: { kind: "choice", choiceId: "c2" } });
    expect(miss.sceneId).toBe("bad");
  });

  it("开始时间之前输入被忽略（不判定、不失败）", () => {
    const d = docWith({ kind: "tap", required: 1, startSec: 1 });
    const s = at(createRuntime(d), d, 0.5);
    const after = tap(s, d);
    expect(after.sceneId).toBe("q");
    expect(after.qteHits).toBe(0);
  });

  it("超时未操作走失败去向", () => {
    const d = docWith({ kind: "tap", required: 5 });
    const s = at(createRuntime(d), d, 3.5);
    expect(s.sceneId).toBe("bad");
    expect(s.qteFeedback).toBe("fail");
  });

  it("已解决的 QTE 不再接受输入", () => {
    const d = docWith({ kind: "tap", required: 1 });
    let s = at(createRuntime(d), d, 0.3);
    s = tap(s, d);
    const before = s;
    s = tap(s, d);
    expect(s).toEqual(before);
  });
});
