/**
 * 公共入口（迁移到 packages/film-editor 后由 package.json#exports 指向这里）。
 *
 * 只导出**可以跨端复用**的东西：
 * - domain：Project v1.0 数据模型、JSON Patch、锚点、样式求值、引用与报价、面板换皮
 * - runtime：试玩状态机（纯函数，不依赖 React）
 * - features/embedded：<FilmEditorApp /> 嵌入组件
 *
 * 服务端（src/server/**）与 Next 路由（src/app/**）不在这里导出，
 * morph 侧自行用 Prisma 信封模型实现 store。
 */
export { FilmEditorApp } from "./embedded";

export * from "./domain/project/schema";
export * from "./domain/project/patch";
export * from "./domain/project/anchor";
export * from "./domain/project/style";
export * from "./domain/project/references";
export * from "./domain/project/export";
export * from "./domain/project/assets";
export * from "./domain/project/panels";
export * from "./domain/runtime/state";