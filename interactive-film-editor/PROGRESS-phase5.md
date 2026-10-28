# Phase 5 · 试玩运行时

日期：2026-10-28
状态：✅ 完成（`verify:static`：lint 0 error（10 warning）/ tsc 0 error / 79 tests）

## 交付

| 模块 | 文件 | 说明 |
|---|---|---|
| 运行时状态机 | `src/domain/runtime/state.ts` | 纯函数 reducer：`createRuntime / reduce(tick·choose·qte·goto·reset)`；6 型节点规则；变量三作用域；章节解锁；结局落盘 |
| 播放舞台 | `src/features/play/PlayStage.tsx` | 只读渲染当前场景版式（复用 anchors + resolveStyle + 成品元件渲染器），叠层由上层传入 |
| 试玩界面 | `src/features/play/PlayRuntime.tsx` | 100ms tick × 倍速；重新开始 / 跳场景 / 设置（倍速·暂停）/ 进度 / 检查面板；选项·QTE·菜单·结算·结局 五类叠层 |
| 页面 | `app/v2/project/[id]/preview/page.tsx` | 试玩页（页签已启用） |
| 持久化 | `PlayRuntime` | `project` 作用域变量写 `localStorage: film:<projectId>:vars`，重开浏览器保留 |

## 运行时语义（与目标产品对齐）

- **auto**：`elapsed >= video.duration` 才跳 `nextSceneId`；没有后续则 `finished`。
- **choice**：`appearAt` 到点才可见、`disappearAt` 之后隐藏；`condition` 不满足则置灰；`setFlags` 在选择时写入变量；`choiceTimeout.sec` 到点自动选「默认选项或第一个可用选项」。
- **qte**：`endSec` 前可判定；成功后走 `onSuccess.nextSceneId`、失败或超时走 `onFail.nextSceneId`。
- **ending**：进入即记录结局编号（`fields.结局编号`，缺省用 scene id），`finished=true`。
- **settlement**：进入即把 `chapterId` 记入 `chaptersDone`。
- **menu**：叠层渲染菜单项；`goScene` 跳转、`continue` 回起始场景。
- **章节解锁**：`chapter_done`（可多选）与 `variable` 两类规则，`AND/OR` 组合。

## 验证（真实输出）

```text
npm run verify:static → 12 files / 79 tests pass（运行时 11 项：auto/choice/超时/QTE/结局/结算/章节/重置/条件）
lint 0 error；tsc 0 error

# 浏览器实测（CDP）
/v2/project/:id/preview → 画布渲染「章节选择 / 第一章 / 第二章 / 第三章」
状态行：ending · 3.8s · 运行中 → 4.4s（tick 正常）
检查面板：场景 / 阶段 / 帧时间 / 最后事件 / 变量
```

截图：`_rea/phase5_preview.png`

## 已知边界（写进 Phase 6/7）

- 没有真实视频/音频元素：播放进度按 `video.duration` 计时，不驱动 `<video>`；素材/云点播接入后再补。
- QTE 只实现了「点按/超时」；mash（连打）、direction（划动）、timing（时机选择）需要各自的输入手势。
- 面板（设置/进度/选集）还是内建浮层，没有接 `project.panels` 的换皮布局。
- 菜单的 `openPanel`/`event`/`quit` 动作目前只做跳转与回起始场景。

## Phase 6 计划

资源页（上传 multipart 契约 + 引用检查 + 配额）→ 设置页（开场主界面 / 配色方案 / 画布字体 / 导出报价）→ 导出网页版包。
