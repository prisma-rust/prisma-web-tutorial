# PrismaRev 引擎课

从零写一台游戏引擎的中文教程站点。53 章、500 多课，每一课只加几行代码。

- 交互版：本地 `npm run dev`，或部署后的站点首页
- 静态版：`ch/cNN.html`（章）、`ch/cNN-MM.html`（课）
- 代码引用指向真实仓库文件，可一键跳到 GitHub 看最新版本

## 本地开发

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc --noEmit && vite build
npm run preview    # 预览 dist/
```

## 目录

```
src/content/curriculum.ts   课程表：部 / 章 / 课（唯一定义）
src/content/*.mdx           每课正文，文件名即课 id
src/lib/diagram.ts          图表 DSL → 内联 SVG
src/lib/icons.ts            lucide 图标
src/main.ts                 站点运行时（路由、侧栏、目录、动效）
src/styles.css              设计系统
build/content.ts            mdx 编译器（代码引用、提示块、图表）
build/plugin.ts             构建期生成静态页
build/repos.ts              可引用仓库与本地路径
docs/AUTHORING.md           写作规范（并行写作用这一份）
```

## 参与写作

先读 [docs/AUTHORING.md](docs/AUTHORING.md)。要点：

- 按章认领，只改自己的 `.mdx`；课 id 永不重排
- 代码用 `ref="仓库:路径#L起-L止"` 引用真实文件，不手抄
- 图表用 `diagram` DSL，不用字符箭头；图标只用 lucide
- 提交前 `npm run build` 必须通过

## 相关仓库

- 引擎：<https://github.com/prisma-rust/prisma-rev>
- 站点：<https://github.com/prisma-rust/prisma-web-tutorial>
