# Phase 6 · 资源页 / 设置页 / 导出报价

日期：2026-10-28
状态：✅ 完成（`verify:static`：lint 0 error（14 warning）/ tsc 0 error / 86 tests）
至此 **8 个页签全部可用**。

## 交付

| 模块 | 文件 | 说明 |
|---|---|---|
| 素材引用扫描 | `src/domain/project/references.ts` | 找出 splash / bgm / 章节封面 / 节点视频 / 预览图 / 版式元件里的引用；`countAssetUsage` 供列表显示「N 处使用」 |
| 导出报价 | `src/domain/project/export.ts` | 200 积分/节点；网页版+桌面版同组、第二个 5 折；安卓独立基线；`computeAllQuotes` |
| 素材仓库 | `src/server/assets/repository.ts` | 内容寻址 `public/uploads/<sha256>.<ext>`；50MB 上限；mime 白名单；PNG/JPEG 头解析宽高 |
| API | `app/api/projects/[id]/assets/route.ts` | `POST` multipart 上传（落盘 + patch 写入文档）；`DELETE ?assetId=`（被引用 → **409 `asset_in_use` + references**） |
| 资源页 | `src/features/assets/AssetsEditor.tsx` | 分类筛选、体积合计、上传、详情（mime/尺寸/体积/hash/src/引用数）、删除（本地预检 + 服务端兜底） |
| 设置页 | `src/features/settings/SettingsEditor.tsx` | 开场主界面（启用/标题/副标题/按钮文案/主色）、配色方案（三预设 + 四色）、画布与字体（尺寸/预设/默认字体）、导出报价表 |

## 验证（真实输出）

```text
npm run verify:static → 13 files / 86 tests pass；lint 0 error；tsc 0 error

# 上传闭环（真实 multipart，非 mock）
POST /api/projects/:id/assets           201  {id: asset_832185a6cbd5, size: 814, 96×96, src: /uploads/832185….png}
文档 assets.images                       0 → 1
DELETE ?assetId=<被引用视频>             409  asset_in_use + references[节点视频 · 播放节点]
DELETE ?assetId=<未引用图片>             200  deleted: true
最终状态                                  images 0 / videos 1（测试数据已清理）

GET /v2/project/:id/assets    200  1 项 · 12.2 MB · 1072×1928 · 1 处使用
GET /v2/project/:id/settings  200  四个分区全部渲染
```

截图：`_rea/phase6_assets.png`、`_rea/phase6_settings.png`

## 这轮修掉的真问题

1. **客户端误引服务端模块**：资源页从 `server/assets/repository` 引 `formatBytes/bucketFor`，会把 `node:fs` 打进浏览器包 → 抽出 `domain/project/assets.ts`（纯函数）双向复用。
2. **错误码语义不对**：删除被引用素材复用了 `revision_conflict` → 新增 `asset_in_use`，前端能区分「被别人改了」和「素材还在用」。
3. **上传后 UI 不同步**：服务端已写入文档，但客户端 doc 没更新 → 改为成功后刷新页面（以服务端为唯一事实来源，避免二次写入）。

## 已知边界

- **没有构建机**：导出只有报价，构建按钮置灰并注明原因（不假装能出包）。
- **视频时长未解析**：上传 mp4 只记 size/mime，没有解析 duration（目标产品有「时长校正」）。
- **无腾讯云 VOD / 直传**：全部走本地 `public/uploads`。
- 素材标签、批量关联、重命名还没做。

## Phase 7 计划（迁移前收口）

1. **样式工程化**：内联 style → CSS 类，落地 `src/styles/film/*.css` + primitive token，满足 morph 的 `tsx-inline-visual-primitive-guard`。
2. **拆 ESLint warning**：`SceneEditor`(120 行)、`SceneCanvas`(~120 行)、`VariablesEditor`(140 行)、`PlayRuntime`(~200 行)、`readImageSize`(复杂度 16)。
3. **打包形态**：整理成 morph 可搬运的 `packages/interactive-film-editor`（含 `package.json` / `embedded.tsx` 入口）。
4. **文档**：迁移说明（哪些文件放哪、哪些守卫会命中、如何豁免）。
