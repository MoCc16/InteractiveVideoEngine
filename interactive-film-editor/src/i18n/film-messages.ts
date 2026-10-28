/**
 * i18n 底座（进 morph 前的门槛项）。
 *
 * 现在只有 zh 一套文案，结构按 next-intl 的命名空间组织（`film.*`），
 * 迁入 morph 后把 `filmMessages` 灌进 next-intl 的 messages，组件侧只改 import。
 * 缺失 key 会返回 key 本身并在控制台警告一次，方便逐步补齐。
 */
export type FilmLocale = "zh" | "en";

const zh = {
  common: {
    save: "保存",
    cancel: "取消",
    delete: "删除",
    rename: "重命名",
    duplicate: "复制",
    open: "打开",
    back: "返回",
    create: "新建",
    close: "关闭",
  },
  editor: {
    backToProjects: "← 全部项目",
    projectName: "项目名称",
    status: {
      saved: "已保存",
      dirty: "未保存",
      saving: "保存中…",
      error: "保存失败",
    },
    pending: "{count} 处待保存",
    revision: "rev {revision}",
    undo: "撤销",
    redo: "重做",
    tabs: {
      graph: "故事图",
      scene: "场景",
      nodes: "节点",
      chapters: "章节",
      variables: "变量",
      assets: "资源",
      preview: "试玩",
      settings: "设置",
    },
  },
  projects: {
    title: "项目",
    count: "共 {count} 个项目 · 点击进入编辑器",
    newPlaceholder: "新项目名",
    newButton: "新建项目",
    creating: "创建中…",
    openGraph: "打开故事图",
    open: "打开",
    copySuffix: "{name} 副本",
  },
} as const;

export type FilmMessages = typeof zh;

const dictionaries: Record<FilmLocale, FilmMessages> = { zh, en: zh };

const warned = new Set<string>();

function lookup(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object" && part in (node as Record<string, unknown>)) {
      return (node as Record<string, unknown>)[part];
    }
    return undefined;
  }, source);
}

export type FilmTranslate = (key: string, vars?: Record<string, string | number>) => string;

export function createFilmTranslator(locale: FilmLocale = "zh"): FilmTranslate {
  const dict = dictionaries[locale] ?? zh;
  return (key, vars) => {
    const value = lookup(dict, key);
    if (typeof value !== "string") {
      if (!warned.has(key)) {
        warned.add(key);
        console.warn(`[film-i18n] 缺少文案：${key}`);
      }
      return key;
    }
    if (!vars) return value;
    return value.replace(/\{(\w+)\}/g, (_, name: string) => String(vars[name] ?? `{${name}}`));
  };
}

/** 服务端/客户端通用的默认翻译（中文） */
export const t: FilmTranslate = createFilmTranslator("zh");