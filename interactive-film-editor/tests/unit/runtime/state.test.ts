import { describe, expect, it } from "vitest";
import { parseProjectDoc, type ProjectDoc } from "@/domain/project/schema";
import {
  availableChoices,
  createRuntime,
  evalCondition,
  initialVariables,
  pickPersisted,
  reduce,
  unlockedChapters,
  type RuntimeState,
} from "@/domain/runtime/state";

function doc(): ProjectDoc {
  return parseProjectDoc({
    schemaVersion: "1.0",
    id: "p1",
    name: "runtime-test",
    canvas: { width: 1920, height: 1080, safeAreas: [] },
    start: { sceneId: "s_auto" },
    variables: [
      { id: "affinity", type: "number", scope: "run", defaultValue: 0 },
      { id: "seen_intro", type: "boolean", scope: "project", defaultValue: false },
    ],
    chapters: [
      { id: "ch1", name: "第一章", isFirst: true, enabled: true },
      {
        id: "ch2",
        name: "第二章",
        isFirst: false,
        enabled: true,
        precondition: { operator: "AND", rules: [{ type: "chapter_done", chapterIds: ["ch1"] }] },
      },
      {
        id: "ch3",
        name: "第三章",
        isFirst: false,
        enabled: true,
        precondition: { operator: "OR", rules: [{ type: "variable", flag: "seen_intro", equals: true }] },
      },
    ],
    scenes: [
      { id: "s_auto", title: "开场", isStart: true, video: { assetId: "a1", duration: 2 }, flow: { kind: "auto", nextSceneId: "s_choice" } },
      {
        id: "s_choice",
        title: "选择",
        chapterId: "ch1",
        video: { assetId: "a2", duration: 5, loop: true },
        flow: {
          kind: "choice",
          choices: [
            { id: "c1", text: "接受", appearAt: 1, nextSceneId: "s_qte", setFlags: { affinity: 1 } },
            { id: "c2", text: "拒绝", appearAt: 1, nextSceneId: "s_end", sortOrder: 1 },
          ],
        },
      },
      {
        id: "s_qte",
        title: "QTE",
        flow: {
          kind: "qte",
          qtes: [
            {
              id: "q1",
              startSec: 0,
              endSec: 2,
              kind: "tap",
              onSuccess: { nextSceneId: "s_end" },
              onFail: { nextSceneId: "s_settlement" },
            },
          ],
        },
      },
      { id: "s_end", title: "结局", isEnding: true, fields: { 结局编号: "E01", 结局标题: "终局" }, flow: { kind: "ending" } },
      { id: "s_settlement", title: "结算", chapterId: "ch1", flow: { kind: "settlement" } },
    ],
  });
}

const tick = (state: RuntimeState, d: ProjectDoc, dt: number) => reduce(state, d, { type: "tick", dt });
const choose = (state: RuntimeState, d: ProjectDoc, id: string) => reduce(state, d, { type: "choose", choiceId: id });

describe("试玩运行时", () => {
  it("从 start.sceneId 启动，进入 play 阶段", () => {
    const d = doc();
    const state = createRuntime(d);
    expect(state.sceneId).toBe("s_auto");
    expect(state.phase).toBe("play");
    expect(state.elapsed).toBe(0);
    expect(state.visited).toEqual(["s_auto"]);
  });

  it("变量按作用域初始化（project 可从持久值恢复）", () => {
    const d = doc();
    expect(initialVariables(d)).toEqual({ affinity: 0, seen_intro: false });
    expect(initialVariables(d, { seen_intro: true })).toEqual({ affinity: 0, seen_intro: true });
  });

  it("auto：未到时长不跳，到时长跳到 next", () => {
    const d = doc();
    let state = createRuntime(d);
    state = tick(state, d, 1);
    expect(state.sceneId).toBe("s_auto");
    state = tick(state, d, 1.1);
    expect(state.sceneId).toBe("s_choice");
    expect(state.phase).toBe("choice");
  });

  it("choice：按 appearAt 出选项，选择后改变量并跳转", () => {
    const d = doc();
    let state = tick(createRuntime(d), d, 2.1);
    expect(state.phase).toBe("choice");
    expect(availableChoices(state, d).every((choice) => !choice.visible)).toBe(true);

    state = tick(state, d, 1.0);
    const options = availableChoices(state, d);
    expect(options.filter((choice) => choice.visible)).toHaveLength(2);

    state = choose(state, d, "c1");
    expect(state.sceneId).toBe("s_qte");
    expect(state.variables.affinity).toBe(1);
  });

  it("choiceTimeout：超时自动选第一个可用选项", () => {
    const d = parseProjectDoc({
      ...doc(),
      scenes: doc().scenes.map((scene) =>
        scene.id === "s_choice" && scene.flow.kind === "choice"
          ? { ...scene, flow: { ...scene.flow, choiceTimeout: { sec: 3 } } }
          : scene,
      ),
    });
    let state = tick(createRuntime(d), d, 2.1); // 进入 choice
    state = tick(state, d, 3.2); // 超过超时
    expect(state.sceneId).toBe("s_qte");
  });

  it("qte：成功后走 onSuccess，超时未操作走 onFail", () => {
    const d = doc();
    const state = reduce(createRuntime(d), d, { type: "goto", sceneId: "s_qte" });
    expect(state.phase).toBe("qte");

    const success = reduce(state, d, { type: "qte", success: true });
    expect(success.sceneId).toBe("s_end");

    const timeout = tick(state, d, 3);
    expect(timeout.sceneId).toBe("s_settlement");
  });

  it("ending：进入即记录结局（用结局编号），并标记 finished", () => {
    const d = doc();
    const state = reduce(createRuntime(d), d, { type: "goto", sceneId: "s_end" });
    expect(state.phase).toBe("ending");
    expect(state.finished).toBe(true);
    expect(state.endings).toEqual(["E01"]);
  });

  it("settlement：进入即把所属章节记为已完成", () => {
    const d = doc();
    const state = reduce(createRuntime(d), d, { type: "goto", sceneId: "s_settlement" });
    expect(state.phase).toBe("settlement");
    expect(state.chaptersDone).toContain("ch1");
  });

  it("章节解锁：chapter_done 与 variable 两种前置条件", () => {
    const d = doc();
    const fresh = createRuntime(d);
    expect(unlockedChapters(fresh, d)).toEqual(["ch1"]); // ch2 需要 ch1，ch3 需要变量

    const afterSettlement = reduce(fresh, d, { type: "goto", sceneId: "s_settlement" });
    expect(unlockedChapters(afterSettlement, d)).toContain("ch2");

    const withVar = { ...fresh, variables: { ...fresh.variables, seen_intro: true } };
    expect(unlockedChapters(withVar, d)).toContain("ch3");
  });

  it("reset 只保留 project 作用域变量", () => {
    const d = doc();
    let state = reduce(createRuntime(d), d, { type: "goto", sceneId: "s_choice" });
    state = tick(state, d, 1.2);
    state = choose(state, d, "c1");
    state = { ...state, variables: { ...state.variables, seen_intro: true, affinity: 9 } };

    expect(pickPersisted(d, state.variables)).toEqual({ seen_intro: true });
    const reset = reduce(state, d, { type: "reset" });
    expect(reset.sceneId).toBe("s_auto");
    expect(reset.variables.affinity).toBe(0);
    expect(reset.variables.seen_intro).toBe(true);
  });

  it("条件求值：any / all / not / 比较", () => {
    const vars = { a: 2, b: true };
    expect(evalCondition({ field: "a", op: ">=", value: 2 }, vars)).toBe(true);
    expect(evalCondition({ field: "b", op: "==", value: true }, vars)).toBe(true);
    expect(evalCondition({ any: [{ field: "a", op: "<", value: 1 }, { field: "b", op: "==", value: true }] }, vars)).toBe(true);
    expect(evalCondition({ all: [{ field: "a", op: "<", value: 1 }] }, vars)).toBe(false);
    expect(evalCondition({ not: { field: "b", op: "==", value: true } }, vars)).toBe(false);
  });
});
