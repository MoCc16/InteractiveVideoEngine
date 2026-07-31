# 互动影游可视化编辑系统

## 运行

需要 Node.js 18 或更新版本。

```powershell
npm start
```

打开 [http://localhost:5173](http://localhost:5173)。

## 本地后端能力

- `GET /api/state`：读取项目状态。
- `PUT /api/state`：保存项目、节点、章节、变量及资源元数据。
- `POST /api/assets`：上传视频、图片、音频或字幕文件。
- 静态资源会保存在 `uploads/`；项目数据保存在 `data/project-state.json`。

`data/` 和 `uploads/` 由运行时生成，已加入 `.gitignore`。生产环境应将项目数据迁移至 PostgreSQL，并将上传资源迁移至对象存储与 CDN。
