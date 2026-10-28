/**
 * 试玩运行时（纯状态机，可测试）。
 *
 * 与目标产品对齐的语义：
 * - 6 型节点各自有进入/推进规则：auto 播完走 next；choice 到点出选项（超时自动选第一个可用）；
 *   qte 在 [startSec,endSec] 内判定，成功/失败各走一条线；ending 到达即记结局；
 *   menu/settlement 是停留型系统页。
 * - 变量三作用域：run（每轮重置）/ session（本会话保留）/ project（跨会话持久，由外部存储提供）。
 * - 章节完成进入 chaptersDone，供章节前置条件（chapter_done / variable）判断。
 */
import type { ProjectDoc, Scene } from "@/domain/project/schema";

export type Phase = "play" | "choice" | "qte" | "ending" | "menu" | "settlement";

export interface RuntimeState {
  sceneId: string;
  phase: Phase;
  elapsed: number;
  variables: Record<string, unknown>;
  visited: string[];
  chaptersDone: string[];
  endings: string[];
  lastEvent: string;
  finished: boolean;
  qteResolved: boolean;
  qteHits: number;
  qteFeedback?: "success" | "fail";
}

export type RuntimeAction =
  | { type: "tick"; dt: number }
  | { type: "choose"; choiceId: string }
  | { type: "qte"; success: boolean }
  | { type: "goto"; sceneId: string }
  | { type: "videoEnded" }
  | { type: "qteInput"; input: { kind: "tap" } | { kind: "direction"; direction: string } | { kind: "choice"; choiceId: string } }
  | { type: "reset" };

const PHASE_BY_KIND: Record<Scene["flow"]["kind"], Phase> = {
  auto: "play",
  choice: "choice",
  qte: "qte",
  ending: "ending",
  menu: "menu",
  settlement: "settlement",
};

export function sceneById(doc: ProjectDoc, id: string): Scene | undefined {
  return doc.scenes.find((scene) => scene.id === id);
}

/** 变量初值：按作用域取值（project 作用域从 persisted 恢复） */
export function initialVariables(doc: ProjectDoc, persisted: Record<string, unknown> = {}): Record<string, unknown> {
  const vars: Record<string, unknown> = {};
  for (const variable of doc.variables) {
    if (variable.scope === "project" && variable.id in persisted) {
      vars[variable.id] = persisted[variable.id];
    } else {
      vars[variable.id] = variable.defaultValue;
    }
  }
  return vars;
}

export function createRuntime(doc: ProjectDoc, persisted: Record<string, unknown> = {}): RuntimeState {
  const startScene = sceneById(doc, doc.start.sceneId) ?? doc.scenes[0];
  const variables = initialVariables(doc, persisted);
  if (!startScene) {
    return {
      sceneId: "",
      phase: "ending",
      elapsed: 0,
      variables,
      visited: [],
      chaptersDone: [],
      endings: [],
      lastEvent: "项目没有场景",
      finished: true,
      qteResolved: false,
      qteHits: 0,
    };
  }
  return enterScene(
    {
      sceneId: startScene.id,
      phase: "play",
      elapsed: 0,
      variables,
      visited: [],
      chaptersDone: [],
      endings: [],
      lastEvent: "启动",
      finished: false,
      qteResolved: false,
      qteHits: 0,
    },
    doc,
    startScene.id,
    "开始时进入",
  );
}

function enterScene(state: RuntimeState, doc: ProjectDoc, sceneId: string, event: string): RuntimeState {
  const scene = sceneById(doc, sceneId);
  if (!scene) {
    return { ...state, finished: true, lastEvent: `目标场景不存在：${sceneId}` };
  }
  const endings = [...state.endings];
  if (scene.flow.kind === "ending" || scene.isEnding) {
    const key = String((scene.fields as Record<string, unknown> | undefined)?.["结局编号"] ?? scene.id);
    if (!endings.includes(key)) endings.push(key);
  }
  const chaptersDone = [...state.chaptersDone];
  if (scene.flow.kind === "settlement" && scene.chapterId && !chaptersDone.includes(scene.chapterId)) {
    chaptersDone.push(scene.chapterId);
  }
  return {
    ...state,
    sceneId,
    phase: PHASE_BY_KIND[scene.flow.kind],
    elapsed: 0,
    visited: state.visited.includes(sceneId) ? state.visited : [...state.visited, sceneId],
    endings,
    chaptersDone,
    lastEvent: event,
    finished: scene.flow.kind === "ending",
    qteResolved: false,
    qteHits: 0,
    qteFeedback: undefined,
  };
}

function advanceAuto(state: RuntimeState, doc: ProjectDoc, event: string): RuntimeState {
  const scene = sceneById(doc, state.sceneId);
  if (!scene || scene.flow.kind !== "auto") return state;
  const next = scene.flow.nextSceneId;
  if (!next) {
    return { ...state, finished: true, lastEvent: "播放结束（无后续节点）" };
  }
  return enterScene(state, doc, next, event);
}

/** 条件求值：与编辑器一致的 any/all/not + 比较运算 */
export function evalCondition(condition: unknown, variables: Record<string, unknown>): boolean {
  if (!condition || typeof condition !== "object") return true;
  const node = condition as { any?: unknown[]; all?: unknown[]; not?: unknown; field?: string; op?: string; value?: unknown };
  if (Array.isArray(node.any)) return node.any.some((item) => evalCondition(item, variables));
  if (Array.isArray(node.all)) return node.all.every((item) => evalCondition(item, variables));
  if (node.not !== undefined) return !evalCondition(node.not, variables);
  if (!node.field || !node.op) return true;
  const actual = variables[node.field];
  switch (node.op) {
    case "==":
      return actual === node.value;
    case "!=":
      return actual !== node.value;
    case ">":
      return Number(actual) > Number(node.value);
    case ">=":
      return Number(actual) >= Number(node.value);
    case "<":
      return Number(actual) < Number(node.value);
    case "<=":
      return Number(actual) <= Number(node.value);
    default:
      return true;
  }
}

export interface AvailableChoice {
  id: string;
  text: string;
  nextSceneId?: string;
  visible: boolean;
  enabled: boolean;
}

/** 某场景当前可用的选项（含可见性与条件） */
export function availableChoices(state: RuntimeState, doc: ProjectDoc): AvailableChoice[] {
  const scene = sceneById(doc, state.sceneId);
  if (!scene || scene.flow.kind !== "choice") return [];
  return scene.flow.choices.map((choice) => {
    const appeared = state.elapsed >= choice.appearAt;
    const disappeared = choice.disappearAt !== undefined && state.elapsed >= choice.disappearAt;
    const conditionOk = evalCondition(choice.condition, state.variables);
    return {
      id: choice.id,
      text: choice.text,
      nextSceneId: choice.nextSceneId,
      visible: appeared && !disappeared,
      enabled: conditionOk,
    };
  });
}

function chooseById(state: RuntimeState, doc: ProjectDoc, choiceId: string): RuntimeState {
  const scene = sceneById(doc, state.sceneId);
  if (!scene || scene.flow.kind !== "choice") return state;
  const choice = scene.flow.choices.find((item) => item.id === choiceId);
  if (!choice || !choice.nextSceneId) return { ...state, lastEvent: "该选项没有去向" };

  const variables = { ...state.variables };
  for (const [key, value] of Object.entries(choice.setFlags ?? {})) variables[key] = value;

  const next = enterScene({ ...state, variables }, doc, choice.nextSceneId, `选择「${choice.text}」`);
  return next;
}

function resolveQte(state: RuntimeState, doc: ProjectDoc, success: boolean): RuntimeState {
  const scene = sceneById(doc, state.sceneId);
  if (!scene || scene.flow.kind !== "qte") return state;
  const qte = scene.flow.qtes[0];
  if (!qte) return state;
  const feedback = success ? "success" : "fail";
  const target = success ? qte.onSuccess.nextSceneId : qte.onFail.nextSceneId;
  if (!target) {
    return {
      ...state,
      qteResolved: true,
      qteFeedback: feedback,
      finished: true,
      lastEvent: success ? "QTE 成功（无去向）" : "QTE 失败（无去向）",
    };
  }
  const next = enterScene({ ...state, qteResolved: true }, doc, target, success ? "QTE 成功" : "QTE 失败");
  return { ...next, qteFeedback: feedback };
}

function tickAuto(state: RuntimeState, doc: ProjectDoc, scene: Scene): RuntimeState {
  if (scene.flow.kind !== "auto") return state;
  const duration = scene.video?.duration ?? 0;
  if (duration > 0 && state.elapsed >= duration) return advanceAuto(state, doc, "播放结束自动跳转");
  return state;
}

function tickChoice(state: RuntimeState, doc: ProjectDoc, scene: Scene): RuntimeState {
  if (scene.flow.kind !== "choice") return state;
  const timeout = scene.flow.choiceTimeout?.sec;
  if (!timeout || state.elapsed < timeout) return state;
  const options = availableChoices(state, doc).filter((choice) => choice.visible && choice.enabled);
  const preferred = scene.flow.choiceTimeout?.defaultChoiceId;
  const pick = options.find((choice) => choice.id === preferred) ?? options[0];
  return pick ? chooseById(state, doc, pick.id) : state;
}

function tickQte(state: RuntimeState, doc: ProjectDoc, scene: Scene): RuntimeState {
  if (scene.flow.kind !== "qte") return state;
  const qte = scene.flow.qtes[0];
  if (!qte || state.qteResolved || state.elapsed <= qte.endSec) return state;
  return resolveQte(state, doc, false);
}

/** 时间推进：按节点类型分派到 auto / choice / qte 的计时逻辑 */
function tickPlay(state: RuntimeState, doc: ProjectDoc, dt: number): RuntimeState {
  const next = { ...state, elapsed: Number((state.elapsed + dt).toFixed(3)) };
  const scene = sceneById(doc, next.sceneId);
  if (!scene) return { ...next, finished: true };
  return tickQte(tickChoice(tickAuto(next, doc, scene), doc, scene), doc, scene);
}
/**
 * QTE 手势输入（tap / mash 用 tap 计数，direction 比方向，choice 比时间窗选项）。
 * 只在 [startSec, endSec] 内生效；窗口外忽略（不是失败）。
 */
export function qteInput(
  state: RuntimeState,
  doc: ProjectDoc,
  input: { kind: "tap" } | { kind: "direction"; direction: string } | { kind: "choice"; choiceId: string },
): RuntimeState {
  const scene = sceneById(doc, state.sceneId);
  if (!scene || scene.flow.kind !== "qte" || state.qteResolved) return state;
  const qte = scene.flow.qtes[0];
  if (!qte) return state;
  if (state.elapsed < qte.startSec || state.elapsed > qte.endSec) return state;

  if (input.kind === "direction") {
    const expected = qte.direction ?? "free";
    const ok = expected === "free" || expected === input.direction;
    return resolveQte({ ...state, qteHits: state.qteHits + 1 }, doc, ok);
  }

  if (input.kind === "choice") {
    const expected = qte.defaultChoiceId;
    const ok = !expected || expected === input.choiceId;
    return resolveQte({ ...state, qteHits: state.qteHits + 1 }, doc, ok);
  }

  const required = qte.required ?? qte.threshold ?? 1;
  const hits = state.qteHits + 1;
  if (hits >= required) return resolveQte({ ...state, qteHits: hits }, doc, true);
  return { ...state, qteHits: hits, lastEvent: `QTE ${hits}/${required}` };
}

export function reduce(state: RuntimeState, doc: ProjectDoc, action: RuntimeAction): RuntimeState {
  switch (action.type) {
    case "tick":
      return tickPlay(state, doc, action.dt);
    case "qteInput":
      return qteInput(state, doc, action.input);
    case "videoEnded": {
      const scene = sceneById(doc, state.sceneId);
      if (!scene) return state;
      if (scene.flow.kind === "auto") return advanceAuto(state, doc, "视频播放结束");
      return { ...state, lastEvent: "视频播放结束" };
    }
    case "choose":
      return chooseById(state, doc, action.choiceId);
    case "qte":
      return resolveQte(state, doc, action.success);
    case "goto": {
      const scene = sceneById(doc, action.sceneId);
      return scene ? enterScene(state, doc, action.sceneId, "跳转") : state;
    }
    case "reset":
      return createRuntime(doc, pickPersisted(doc, state.variables));
    default:
      return state;
  }
}

/** 只保留 project 作用域变量，作为下一轮持久值 */
export function pickPersisted(doc: ProjectDoc, variables: Record<string, unknown>): Record<string, unknown> {
  const persisted: Record<string, unknown> = {};
  for (const variable of doc.variables) {
    if (variable.scope === "project" && variable.id in variables) persisted[variable.id] = variables[variable.id];
  }
  return persisted;
}

/** 章节解锁：满足 precondition 的章节 id 集合 */
export function unlockedChapters(state: RuntimeState, doc: ProjectDoc): string[] {
  return doc.chapters
    .filter((chapter) => {
      if (chapter.isFirst) return true;
      const rules = chapter.precondition?.rules ?? [];
      if (rules.length === 0) return true;
      const check = (rule: (typeof rules)[number]) =>
        rule.type === "chapter_done"
          ? rule.chapterIds.every((id) => state.chaptersDone.includes(id))
          : state.variables[rule.flag] === rule.equals;
      return chapter.precondition?.operator === "OR" ? rules.some(check) : rules.every(check);
    })
    .map((chapter) => chapter.id);
}
