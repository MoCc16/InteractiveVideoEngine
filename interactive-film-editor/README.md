# 互动影游编辑器

互动影游可视化编辑器：单文档驱动的场景编排 + 分支剧情 + 试玩 + 导出，按「可直接迁进 morph」的形态组织代码。

- 技术栈：Next.js 15 App Router + React 19 + TypeScript strict + zod + Tailwind v4 + 自有 CSS token
- 数据模型：**单个 Project v1.0 JSON 文档 + JSON Patch(RFC 6902) 修订**，不做关系化拆表（与目标产品一致，避免业务模型重写）
- 视觉：布局/密度/配色取自目标产品实测 token（`design/design-tokens.json`）

## 快速开始

```bash
npm install
npm run dev          # http://127.0.0.1:3080
npm run verify:static # lint + typecheck + test + 内联视觉原语守卫
```

示例项目放在 `data/projects/`（已 gitignore），首次启动可从 `../_rea/project_*.json` 复制三份真实工程进去。

## 目录

```
src/
  app/                Next 路由（/projects、/v2/project/[id]/*、/api/**）
  domain/             纯逻辑：project（schema/patch/anchor/style/export/panels）、runtime（试玩状态机）
  server/             服务端：projects store/service、auth、assets 仓库、媒体网关
  features/           页面级功能：editor / scene / nodes / chapters / variables / assets / settings / story-graph / play
  components/ui/      视觉原语（icons、图边、故事线缩略图）
  styles/film/        设计 token 与 UI 原子类
  embedded.tsx        <FilmEditorApp /> 嵌入入口（morph 侧接入点）
  index.ts            公共导出（未来 packages/film-editor 的 exports）
docs/
  decisions/          架构决策记录
  migration-to-morph.md  迁移落位说明
  GOAL-LOG.md         目标模式逐轮执行日志
```

## 已实现

| 模块 | 状态 |
|---|---|
| 项目列表 / 新建 / 复制 / 重命名 | ✅ |
| 场景编辑器（画布、图层树、拖拽缩放、锚点、属性面板、配色） | ✅ |
| 节点编辑（6 种 flow：auto/choice/qte/menu/ending/settlement） | ✅ |
| 章节 / 变量 / 资源（上传、删除、引用检查、时长与尺寸探测） | ✅ |
| 故事图（分层布局 + 边） | ✅ |
| 试玩（状态机、真实视频播放、QTE 四手势、换皮面板、变量持久化） | ✅ |
| 修订历史 / 回滚 / 协同冲突（baseRevision → 409） | ✅ |
| 导出报价（200 积分/节点、第二目标 5 折） | ✅（不接构建机） |

## 未实现 / 差异

- 导出构建流水线（目标产品有构建机，本仓库只算报价）
- 目标产品字体子集（2122 个 woff2 切片）未搬，当前用系统字体栈兜底
- COS/VOD 直传、素材标签与批量绑定、mp4 拖拽时长校正的手动修正入口
- 多语言齐全度：i18n 骨架在，但只接了中文

## 文档

- [迁移到 morph](docs/migration-to-morph.md)
- [架构决策 0001](docs/decisions/0001-stack-and-model.md)
- [目标模式执行日志](docs/GOAL-LOG.md)
- [视觉对齐记录](PROGRESS-visual-v0.md)
- 逆向分析产物在仓库同级的 `_rea/`：`REPORT.md`、`UI_INVENTORY.md`（≈97% 功能覆盖）、`api_static.txt`（329 个接口）