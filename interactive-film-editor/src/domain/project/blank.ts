import { parseProjectDoc, type ProjectDoc } from "./schema";

export function newProjectId(): string {
  return `proj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 空白工程：一个起始（结局）节点 + 一个章节 + 一个主界面版式，可直接进编辑器 */
export function createBlankProject(name: string, id = newProjectId()): ProjectDoc {
  const sceneId = "scene_start";
  const raw = {
    schemaVersion: "1.0",
    id,
    name,
    canvas: { width: 1920, height: 1080, safeAreas: [] },
    start: { sceneId },
    chapters: [{ id: "chapter_1", name: "第一章", isFirst: true, enabled: true }],
    scenes: [
      {
        id: sceneId,
        title: "开场",
        displayTitle: "开场",
        isStart: true,
        isEnding: true,
        chapterId: "chapter_1",
        layoutId: "lay_main",
        flow: { kind: "ending" },
      },
    ],
    variables: [],
    assets: { videos: {}, images: {}, audio: {}, lotties: {} },
    layouts: {
      shared: [
        {
          id: "lay_main",
          name: "主界面",
          root: {
            id: "lay_main_root",
            type: "group",
            anchors: { left: { value: 0, unit: "%" }, right: { value: 0, unit: "%" } },
            anchorsY: { top: { value: 0, unit: "%" }, bottom: { value: 0, unit: "%" } },
            children: [
              {
                id: "lay_main_title",
                type: "text",
                z: 1,
                anchors: { left: { value: 50, unit: "%" }, right: { value: 50, unit: "%" }, top: { value: 40, unit: "%" } },
                content: { kind: "literal", value: "开场标题" },
              },
            ],
          },
        },
      ],
      bindings: {},
    },
    theme: { tokens: { accent: "#c9a84c", accentStrong: "#f0d060", background: "#141414", text: "#e8e4d8" } },
  };
  return parseProjectDoc(raw);
}