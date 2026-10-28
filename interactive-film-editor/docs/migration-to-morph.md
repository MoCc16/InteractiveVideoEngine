# 迁移到 morph 的落位说明

> 目标仓库：`https://github.com/oz36/morph`（Next App Router + TS strict + token 体系 + 96 个守卫）
> 当前实现：`interactive-film-editor/`（同栈：Next 15 / React 19 / TS strict / vitest）

## 1. 先明确三条约束（来自 morph 的守卫）

| 守卫 | 它拦什么 | 对本项目的影响 |
|---|---|---|
| `tsx-inline-visual-primitive-guard` | TSX 里内联 `fontSize/width/height/gap/margin/padding…` | 已把外壳改成 CSS 类；画布几何必须保留内联（见 §4） |
| `file-line-count-guard` | 组件 500 / hook 400 / worker 300 / mutation 300 行 | 目前最大文件 < 300 行，通过 |
| `no-restricted-syntax / no-restricted-imports` | 内联 `<svg>`、直连图标库 | 已满足：SVG 只在 `components/ui/{icons,graph}` |

另外 `check:no-console`、`check:no-multiple-sources-of-truth`、`check:no-server-mirror-state` 等也适用：
本项目没有 `console.*`，文档是唯一事实来源，服务端不缓存镜像状态。

## 2. 推荐落位（A → 逐步 B）

```
packages/interactive-film-editor/        ← 第一步：整体搬运，隔离守卫
  package.json                           （name: @oz36/interactive-film-editor）
  src/…                                  （当前 src 内容）
  embedded.tsx                           （= 本仓库 src/embedded.tsx）
```

第二步再按 `src/features/interactive-film/**` 合并，复用 morph 的 `components/ui`、`i18n`、`apiHandler`。

**tsconfig / eslint 需要加的排除**（照抄 `packages/opencut-classic-editor` 的做法）：

```jsonc
// tsconfig.json
"exclude": ["node_modules", "scripts", "prototypes", "packages/opencut-classic-editor", "packages/interactive-film-editor"]

// eslint.config.mjs
ignores: [..., "packages/interactive-film-editor/**"]
```

## 3. 需要替换成 morph 实现的四处

| 本仓库 | morph 对应物 |
|---|---|
| `src/server/http/api-handler.ts` + `api-error.ts` | `@/lib/api-errors` 的 `apiHandler` + `UnifiedErrorCode` |
| `src/server/auth/session.ts`（`x-user-id` 桩） | `requireUserAuth` / `requireProjectAuth` |
| `src/server/projects/store.ts`（文件存储） | `PrismaProjectStore`（见下） |
| `src/i18n/navigation.ts`（next/navigation 透传） | `@/i18n/navigation`（next-intl） |

文案也要从 JSX 里搬到 `messages/{zh,en}/interactiveFilm.json`。

## 4. 数据处理（业务模型不重写）

`prisma/schema.prisma` 已经给出信封模型，直接并入 morph 的 schema：

```prisma
model Project         { id String @id; ownerId String; name String; doc Json; revision Int @default(0); … }
model ProjectRevision { id String @id @default(cuid()); projectId String; revision Int; ops Json; actorId String; … }
```

`FileProjectStore` 与 `PrismaProjectStore` 实现同一个 `ProjectStore` 接口，调用方零改动。

## 5. 画布/舞台为什么必须豁免内联样式

`SceneCanvas` / `PlayStage` / `StoryGraphView` 的 `left/top/width/height` 来自锚点计算与运行时布局，
属于**数据驱动几何**，无法预生成类名。morph 自己也是这么处理的：`tsx-inline-visual-primitive-guard`
的 `defaultExcludedPathSegments` 里就有 `/video-editor/`。

建议在 morph 的守卫里加一条带理由的排除：

```js
'/interactive-film/',           // 画布几何来自锚点计算
'/features/scene/',
'/features/play/',
```

## 6. 当前完成度（可核对）

```text
内联视觉原语：21 文件 / 247 处  →  15 文件 / 171 处（已改：外壳、页签、图层树、配色面板、首页、项目页、根布局）
剩余（按处数）：
  settings/SettingsEditor 23    scene/PropertyPanel 21    scene/renderers 17
  assets/AssetsEditor 16        play/PlayRuntime 14       scene/SceneEditor 14
  variables/VariablesEditor 13  chapters/ChapterForm 12   nodes/NodesEditor 11
  chapters/ChaptersEditor 9     nodes/ChoiceFlowEditor 9  nodes/NodeForm 5
  nodes/NodeFlowEditors 4       scene/LayerTree 1         scene/ThemePanel 1
```

自查命令：`npm run check:inline`（报告）/ `npm run check:inline:strict`（CI 阻断）。

## 7. 迁移后仍需补齐的能力

1. 真实视频/音频播放（`<video>` + hls.js），目前按 `video.duration` 计时；
2. QTE 的 mash / direction / timing 手势；
3. `project.panels` 面板换皮（设置/进度/选集）；
4. 导出构建流水线（morph 侧没有对应构建机，需要另配服务）；
5. 资源上传改走 morph 的 `outbound-image` 归一化与 COS/VOD。

---

## 包形态（第 9 轮补充）

迁入 morph 时按下面这棵树落地，`src/index.ts` 就是未来的 `package.json#exports`：

```
packages/film-editor/
  package.json            # name: @morph/film-editor, exports: { ".": "./src/index.ts" }
  src/
    index.ts              # 公共导出（已就绪，见下）
    embedded.tsx          # <FilmEditorApp projectId doc revision />
    domain/
      project/{schema,patch,anchor,style,references,export,assets,panels}.ts
      runtime/state.ts
    features/{editor,scene,nodes,chapters,variables,assets,settings,story-graph,play}/**
    components/ui/{icons,graph}/**
    styles/film/{tokens.css,tokens/*.css,ui.css}
  tests/                  # 从本仓库 tests/unit 复制（101 项）
```

`src/index.ts` 已导出：`FilmEditorApp`、`domain/project/*`、`domain/runtime/state`。**不导出** `server/**` 与 `app/**` —— morph 用 Prisma 信封模型自己实现 store。

### 落地步骤

| # | 动作 | 说明 |
|---|---|---|
| 1 | 复制 `src/{domain,features,components/ui,styles/film}` + `index.ts` + `embedded.tsx` | 纯前端，无 Next 依赖 |
| 2 | 别名替换 `@/` → `@film/` | tsconfig paths + 一次性 import 重写 |
| 3 | 替换四处 Next 依赖 | `next/link` → morph 的 `Link`；`next/navigation` 的 `useRouter` → 由 props 注入；`next/image` → morph 的 `Image`；`next/dynamic` → 普通 `lazy` |
| 4 | Prisma 信封模型 | `film_project(id, name, doc Json, revision Int, createdAt, updatedAt)`、`film_project_revision(id, projectId, revision, ops Json, inverse Json, createdAt)`；**不要**把 doc 拆表 |
| 5 | 守卫对齐 | morph 的 `tsx-inline-visual-primitive-guard` 需把 `packages/film-editor/src/features/scene/` 加进豁免（画布几何由数据驱动，等价于 morph 现有的 `/video-editor/` 豁免）；其余文件当前 **0 处内联**，可直接通过 |
| 6 | 样式接入 | `styles/film/tokens.css` 在包入口 import；token 命名已按 `--film-*` 隔离，不与 morph 的 `--surface-*` 冲突 |
| 7 | i18n | 中文文案现在硬编码在组件里；迁入后用 morph 的 `next-intl` 命名空间 `film.*` 包一层（约 200 条 key） |
| 8 | 字体 | 目标产品字体子集未搬；如需一致排版，把 `_rea/web/assets/fonts-*.css` 与对应 woff2 放进包内 |

### 就绪度自检

```text
npm run verify:static   # lint 0 / tsc 0 / 101 tests / 内联 0（strict）
```

- 内联视觉原语：**0**（可满足 morph 守卫）
- ESLint：**0 error / 0 warning**
- 类型：strict 全绿
- 测试：101 项，覆盖 schema-vs-真实文档、patch、store、冲突、锚点、样式、注册表、布局、拖拽、运行时、QTE、素材/报价、面板换皮、MP4 时长