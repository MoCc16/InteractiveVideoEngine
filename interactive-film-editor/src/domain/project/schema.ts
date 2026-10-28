/**
 * Project 文档模型（v1.0）—— 全项目唯一事实来源（single source of truth）。
 *
 * 该模型来自对目标产品（Choiscene 互动影游编辑器 v0.7.1）的运行时逆向：
 * 逐字段核对过 3 份真实项目文档；本文件是"业务模型不重写"的落地：
 * 数据库只存 doc（JSON）+ 版本（revision），领域模型始终是这份 zod schema。
 *
 * 约定：
 * - 未知字段用 `.passthrough()` 保留（向前兼容，避免丢数据）；
 * - 枚举保持与目标产品一致的字符串值，不做本地化；
 * - 可选字段的默认值与目标产品一致（见注释）。
 */
import { z } from "zod";

export const PROJECT_SCHEMA_VERSION = "1.0" as const;

/* ────────────────────────────── 基础原语 ────────────────────────────── */

export const anchorUnitSchema = z.enum(["%", "px"]);

export const anchorSchema = z
  .object({
    value: z.number(),
    unit: anchorUnitSchema,
    offset: z.number().optional(),
  })
  .passthrough();

export const anchorsSchema = z
  .object({
    top: anchorSchema.optional(),
    right: anchorSchema.optional(),
    bottom: anchorSchema.optional(),
    left: anchorSchema.optional(),
  })
  .passthrough();

export const sizeDimSchema = z
  .object({
    value: z.number(),
    unit: z.enum(["%", "px", "auto"]),
  })
  .passthrough();

export const sizeSchema = z
  .object({
    width: sizeDimSchema.optional(),
    height: sizeDimSchema.optional(),
  })
  .passthrough();

/* ────────────────────────────── 元件 ────────────────────────────── */

/** 已知元件类型（27 项，实测于元件库；允许未知类型以向前兼容） */
export const KNOWN_COMPONENT_TYPES = [
  // 基础
  "text",
  "image",
  "video",
  "button",
  "group",
  "progressBar",
  "fieldText",
  // 成品（实测出现在真实项目文档中的类型名）
  "choiceList",
  "chapterTitle",
  "atmosphericOverlay",
  "typewriterText",
  "videoPlayer",
  "navMenu",
  "mainMenu",
  "splashScreen",
  "mobileProgressBar",
  "progressPreview",
  "actionButton",
  "endingButton",
  "endingOrnament",
  "endingHint",
  "chapterListView",
  "settlementAchievements",
  "storyMap",
  "storyProgress",
  "qteHandle",
  "qteGoldHandle",
  // 面板
  "speedSelector",
  "volumeSlider",
  "panelCloseButton",
] as const;

/**
 * 实测只有两种形态：
 *  - { kind: "literal", value }        字面量
 *  - { kind: "binding", expr }         绑定表达式，如 `${node.结局标题}`
 * 未知形态用宽松分支保留，避免导入旧/新数据时丢字段。
 */
export const contentSchema = z
  .object({
    /** literal | binding | 未来可能的新形态 */
    kind: z.string().min(1),
    /** literal 的值（字符串/数字/动作对象） */
    value: z.unknown().optional(),
    /** binding 的表达式，如 ${node.结局标题} */
    expr: z.string().optional(),
  })
  .passthrough();

export type Component = {
  id: string;
  type: string;
  anchors?: z.infer<typeof anchorsSchema>;
  size?: z.infer<typeof sizeSchema>;
  z?: number;
  rotation?: number;
  content?: z.infer<typeof contentSchema>;
  children?: Component[];
  /** 元件样式：每个值同样是 {kind:"literal"|"binding", value|expr} 包装 */
  style?: Record<string, unknown>;
  /** 成品元件的模板绑定（如 accentColor / chapterCover） */
  bindings?: Record<string, unknown>;
};

export const componentSchema: z.ZodType<Component> = z.lazy(() =>
  z
    .object({
      id: z.string().min(1),
      type: z.string().min(1),
      anchors: anchorsSchema.optional(),
      size: sizeSchema.optional(),
      z: z.number().optional(),
      rotation: z.number().optional(),
      content: contentSchema.optional(),
      children: z.array(componentSchema).optional(),
      style: z.record(z.unknown()).optional(),
      bindings: z.record(z.unknown()).optional(),
    })
    .passthrough(),
);

/* ────────────────────────────── 条件表达式 ────────────────────────────── */

export const COMPARISON_OPS = ["==", "!=", ">", ">=", "<", "<="] as const;

export type Condition = {
  any?: Condition[];
  all?: Condition[];
  not?: Condition;
  field?: string;
  op?: (typeof COMPARISON_OPS)[number];
  value?: unknown;
};

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z
    .object({
      any: z.array(conditionSchema).optional(),
      all: z.array(conditionSchema).optional(),
      not: conditionSchema.optional(),
      field: z.string().optional(),
      op: z.enum(COMPARISON_OPS).optional(),
      value: z.unknown().optional(),
    })
    .passthrough(),
);

/* ────────────────────────────── 转场 / 特效 / 调色 ────────────────────────────── */

export const transitionSchema = z
  .object({
    mode: z.enum(["none", "fade", "cut", "flash", "wipe"]),
    durationMs: z.number().nonnegative().optional(),
  })
  .passthrough();

export const sceneEffectsSchema = z
  .object({
    vignette: z.number().min(0).max(1).default(0),
    blur: z.number().nonnegative().default(0),
    grain: z.number().min(0).max(1).default(0),
    ambientAssetId: z.string().optional(),
  })
  .passthrough();

export const colorGradeSchema = z
  .object({
    kind: z.enum(["none", "cold", "warm", "sepia", "grayscale", "custom"]),
    matrix: z.array(z.number()).optional(),
  })
  .passthrough();

/* ────────────────────────────── 节点 flow（6 种） ────────────────────────────── */

export const choiceItemSchema = z
  .object({
    id: z.string().min(1),
    text: z.string(),
    tooltip: z.string().optional(),
    appearAt: z.number().nonnegative().default(0),
    disappearAt: z.number().nonnegative().optional(),
    tooltipAt: z.number().nonnegative().optional(),
    condition: conditionSchema.optional(),
    setFlags: z.record(z.unknown()).optional(),
    nextSceneId: z.string().min(1).optional(),
    transition: transitionSchema.optional(),
    sortOrder: z.number().int().default(0),
  })
  .passthrough();

export const choiceTimeoutSchema = z
  .object({
    sec: z.number().positive(),
    defaultChoiceId: z.string().optional(),
  })
  .passthrough();

export const QTE_KINDS = ["tap", "mash", "direction", "timing"] as const;
export const QTE_DIRECTIONS = ["up", "down", "left", "right", "free"] as const;

export const hotRegionSchema = z
  .object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    unit: z.enum(["%", "px"]).default("%"),
  })
  .passthrough();

export const qteOutcomeSchema = z
  .object({
    nextSceneId: z.string().min(1).optional(),
  })
  .passthrough();

export const qteActionSchema = z
  .object({
    id: z.string().min(1),
    startSec: z.number().nonnegative(),
    endSec: z.number().positive(),
    kind: z.enum(QTE_KINDS),
    hotRegion: hotRegionSchema.optional(),
    /** tap 用：点击次数 */
    required: z.number().int().positive().optional(),
    /** mash 用：蓄力阈值 */
    threshold: z.number().int().positive().optional(),
    /** direction 用：方向与最小距离 */
    direction: z.enum(QTE_DIRECTIONS).optional(),
    minDistance: z.number().positive().optional(),
    /** timing 用：时间窗与选项 */
    durationSec: z.number().positive().optional(),
    choices: z
      .array(z.object({ id: z.string().min(1), label: z.string(), atSec: z.number().nonnegative() }).passthrough())
      .optional(),
    defaultChoiceId: z.string().optional(),
    onSuccess: qteOutcomeSchema,
    onFail: qteOutcomeSchema,
  })
  .passthrough();

export const qteConfigSchema = z
  .object({
    promptText: z.string().optional(),
    videoBehavior: z.enum(["pause", "play"]).optional(),
    promptPosition: z.enum(["top", "middle", "bottom"]).optional(),
    successFeedback: z.enum(["flash", "shake", "none"]).optional(),
    failFeedback: z.enum(["flash", "shake", "none"]).optional(),
    prewarnMs: z.number().int().nonnegative().optional(),
    outcomeMode: z.enum(["branch", "flag_only"]).optional(),
  })
  .passthrough();

export const menuActionSchema = z
  .object({
    type: z.enum(["goScene", "continue", "openPanel", "quit", "event"]),
    sceneId: z.string().optional(),
    panel: z.string().optional(),
    name: z.string().optional(),
  })
  .passthrough();

export const menuItemSchema = z
  .object({
    id: z.string().min(1),
    label: z.string(),
    action: menuActionSchema.default({ type: "goScene" }),
    /** 始终 / 仅无进度 / 仅有进度 */
    showWhen: z.enum(["始终", "仅无进度", "仅有进度"]).optional(),
    icon: z.string().optional(),
  })
  .passthrough();

export const rankTierSchema = z
  .object({ min: z.number(), rank: z.string() })
  .passthrough();

export const achievementSchema = z
  .object({ name: z.string(), condition: conditionSchema.optional() })
  .passthrough();

export const autoFlowSchema = z
  .object({
    kind: z.literal("auto"),
    nextSceneId: z.string().min(1).optional(),
    transition: transitionSchema.optional(),
  })
  .passthrough();

export const choiceFlowSchema = z
  .object({
    kind: z.literal("choice"),
    choices: z.array(choiceItemSchema).default([]),
    choiceTimeout: choiceTimeoutSchema.optional(),
  })
  .passthrough();

export const qteFlowSchema = z
  .object({
    kind: z.literal("qte"),
    qtes: z.array(qteActionSchema).min(1),
    defaultNextSceneId: z.string().optional(),
    config: qteConfigSchema.optional(),
  })
  .passthrough();

export const endingFlowSchema = z
  .object({ kind: z.literal("ending") })
  .passthrough();

export const menuFlowSchema = z
  .object({
    kind: z.literal("menu"),
    items: z.array(menuItemSchema).default([]),
  })
  .passthrough();

export const settlementFlowSchema = z
  .object({
    kind: z.literal("settlement"),
    showRank: z.boolean().default(false),
    rankSource: z.string().optional(),
    rankTiers: z.array(rankTierSchema).default([]),
    achievements: z.array(achievementSchema).default([]),
    collectionSource: z.string().optional(),
    collectionTotal: z.number().int().nonnegative().optional(),
    nextChapterNodeId: z.string().optional(),
    backToList: z.boolean().default(true),
    nextBtnText: z.string().default("进入下一章"),
  })
  .passthrough();

export const flowSchema = z.discriminatedUnion("kind", [
  autoFlowSchema,
  choiceFlowSchema,
  qteFlowSchema,
  endingFlowSchema,
  menuFlowSchema,
  settlementFlowSchema,
]);

export type SceneFlow = z.infer<typeof flowSchema>;

/* ────────────────────────────── 场景（节点） ────────────────────────────── */

export const sceneVideoSchema = z
  .object({
    assetId: z.string().min(1),
    duration: z.number().positive(),
    loopStart: z.number().nonnegative().optional(),
    loopEnd: z.number().positive().optional(),
    loop: z.boolean().optional(),
    freezeOnFirstLoop: z.boolean().default(true),
  })
  .passthrough();

export const narrationSchema = z
  .object({
    text: z.string().default(""),
    startSec: z.number().nonnegative().default(0),
  })
  .passthrough();

export const sceneSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().default(""),
    displayTitle: z.string().optional(),
    subtitle: z.string().optional(),
    layoutId: z.string().optional(),
    /** 所属章节；未归章时为空 */
    chapterId: z.string().optional(),
    createdAt: z.string().optional(),
    isStart: z.boolean().default(false),
    isEnding: z.boolean().default(false),
    effects: sceneEffectsSchema.optional(),
    video: sceneVideoSchema.optional(),
    narration: narrationSchema.optional(),
    posterAssetId: z.string().optional(),
    colorGrade: colorGradeSchema.optional(),
    transition: transitionSchema.optional(),
    /** 节点字段：键值，供 fieldText 元件绑定 */
    fields: z.record(z.unknown()).optional(),
    flow: flowSchema,
  })
  .passthrough();

export type Scene = z.infer<typeof sceneSchema>;

/* ────────────────────────────── 章节 / 变量 ────────────────────────────── */

export const chapterPreconditionRuleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("chapter_done"), chapterIds: z.array(z.string()).default([]) }).passthrough(),
  z.object({ type: z.literal("variable"), flag: z.string(), equals: z.unknown() }).passthrough(),
]);

export const chapterPreconditionSchema = z
  .object({
    operator: z.enum(["AND", "OR"]).default("AND"),
    rules: z.array(chapterPreconditionRuleSchema).default([]),
  })
  .passthrough();

export const chapterSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    seqLabel: z.string().optional(),
    summary: z.string().optional(),
    startNodeId: z.string().optional(),
    isFirst: z.boolean().default(false),
    enabled: z.boolean().default(true),
    precondition: chapterPreconditionSchema.optional(),
    note: z.string().optional(),
    coverAssetId: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const VARIABLE_TYPES = ["string", "number", "boolean"] as const;
export const VARIABLE_SCOPES = ["run", "session", "project"] as const;

export const variableSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().optional(),
    description: z.string().optional(),
    type: z.enum(VARIABLE_TYPES),
    scope: z.enum(VARIABLE_SCOPES),
    defaultValue: z.unknown(),
  })
  .passthrough();

/* ────────────────────────────── 素材 / 版式 ────────────────────────────── */

export const ASSET_KINDS = ["video", "image", "audio", "lottie"] as const;

export const assetSchema = z
  .object({
    id: z.string().min(1),
    kind: z.enum(ASSET_KINDS),
    src: z.string().min(1),
    mime: z.string(),
    hash: z.string().optional(),
    name: z.string(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    duration: z.number().nonnegative().optional(),
    size: z.number().int().nonnegative().optional(),
    createdAt: z.string().optional(),
    tags: z.array(z.string()).default([]),
  })
  .passthrough();

export const layoutSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().optional(),
    root: componentSchema,
  })
  .passthrough();

export const layoutsSchema = z
  .object({
    shared: z.array(layoutSchema).default([]),
    bindings: z.record(z.unknown()).default({}),
  })
  .passthrough();

/* ────────────────────────────── 项目级配置 ────────────────────────────── */

export const canvasSchema = z
  .object({
    width: z.number().int().positive().default(1920),
    height: z.number().int().positive().default(1080),
    orientation: z.enum(["landscape", "portrait", "square"]).optional(),
    safeAreas: z.array(z.unknown()).default([]),
  })
  .passthrough();

export const themeSchema = z
  .object({
    tokens: z.record(z.unknown()).default({}),
    defaultFont: z.string().optional(),
    schemes: z.array(z.unknown()).optional(),
  })
  .passthrough();

export const audioSchema = z
  .object({
    bgmAssetId: z.string().optional(),
    bgmVolume: z.number().min(0).max(1).optional(),
    sfx: z.record(z.unknown()).default({}),
  })
  .passthrough();

export const splashSchema = z
  .object({
    enabled: z.boolean().default(false),
    title: z.string().default(""),
    subtitle: z.string().optional(),
    startLabel: z.string().default("开始"),
    accentColor: z.string().optional(),
    bgImageAssetId: z.string().optional(),
  })
  .passthrough();

export const panelsSchema = z
  .object({
    settings: z.string().optional(),
    progress: z.string().optional(),
    chapters: z.string().optional(),
  })
  .passthrough();

export const assetsSchema = z
  .object({
    videos: z.record(assetSchema).default({}),
    images: z.record(assetSchema).default({}),
    audio: z.record(assetSchema).default({}),
    lotties: z.record(assetSchema).default({}),
  })
  .passthrough();

/* ────────────────────────────── 项目文档 ────────────────────────────── */

export const projectDocSchema = z
  .object({
    schemaVersion: z.literal(PROJECT_SCHEMA_VERSION),
    id: z.string().min(1),
    name: z.string(),
    meta: z
      .object({
        createdAt: z.string().optional(),
        updatedAt: z.string().optional(),
      })
      .passthrough()
      .optional(),
    canvas: canvasSchema,
    theme: themeSchema.optional(),
    audio: audioSchema.optional(),
    start: z.object({ sceneId: z.string().min(1) }).passthrough(),
    splash: splashSchema.optional(),
    panels: panelsSchema.optional(),
    scenes: z.array(sceneSchema),
    chapters: z.array(chapterSchema).default([]),
    variables: z.array(variableSchema).default([]),
    layouts: layoutsSchema.optional(),
    assets: assetsSchema.optional(),
    components: z.array(z.unknown()).default([]),
  })
  .passthrough();

export type ProjectDoc = z.infer<typeof projectDocSchema>;
export type ProjectScene = z.infer<typeof sceneSchema>;
export type ProjectChapter = z.infer<typeof chapterSchema>;
export type ProjectVariable = z.infer<typeof variableSchema>;
export type ProjectAsset = z.infer<typeof assetSchema>;
export type ProjectLayout = z.infer<typeof layoutSchema>;

/** 严格解析：失败抛错，并给出可读路径 */
export function parseProjectDoc(input: unknown): ProjectDoc {
  return projectDocSchema.parse(input);
}

/** 宽松解析：用于导入/迁移期，返回 issues 而不抛错 */
export function safeParseProjectDoc(input: unknown) {
  return projectDocSchema.safeParse(input);
}
