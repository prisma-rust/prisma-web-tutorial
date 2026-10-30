# PrismaRev Web Tutorial

PrismaRev 的交互式教学站点：从 Rust 基础、Cargo 工作区，到 winit / Vulkan 渲染后端与完整引擎设计。

内容按开发依赖顺序组织，包含 15 章正文和若干交互式可视化（帧循环、ECS、坐标空间、渲染图等）。

## 本地开发

```sh
npm install
npm run dev
```

Vite 默认在 `http://localhost:5173` 启动。

## 构建与预览

```sh
npm run build
npm run preview
```

构建产物输出到 `dist/`。`vite.config.ts` 使用 `base: "./"`，因此可以直接部署到任意子路径的静态托管。

## 目录

- `src/content/` — 各章 Markdown 正文
- `src/chapters.ts` — 章节顺序与侧边栏分组
- `src/viz/` — 交互式可视化组件
- `src/highlight.ts` — Markdown 渲染与代码高亮
- `src/styles.css` — 全站样式
- `public/assets/` — 占位插图

## 相关仓库

- PrismaRev 引擎：<https://github.com/Excurs1ons/prisma-rev>
