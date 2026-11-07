# 内容写作规范

这份文档是给「并行写教程的人」看的：怎么加一章、加一课，怎么写代码引用和图表，怎么保证你写的东西不会在别人机器上炸掉。

站点是**构建期编译**的：`.mdx` 在 `npm run build` 时变成 HTML 字符串，浏览器里没有 Markdown 解析器、没有 shiki、没有 mermaid。你写错的东西会在构建时报出来，而不是在读者屏幕上报出来。

---

## 1. 目录结构

```
src/content/curriculum.ts   课程表（章、课的唯一定义）
src/content/<lesson>.mdx    每一课的正文，文件名 = 课 id
src/lib/diagram.ts          图表 DSL → 内联 SVG
src/lib/icons.ts            lucide 图标（唯一图标来源）
src/main.ts                 站点运行时：路由、侧栏、目录、动效
src/styles.css              设计系统与全部样式
build/content.ts            mdx → HTML 编译器（ref、callout、图表）
build/plugin.ts             Vite 插件：编译、生成静态页
build/repos.ts              代码引用用到的仓库与本地路径
docs/AUTHORING.md           本文
```

`dist/` 里会同时产出两种页面：`index.html`（交互版 SPA）和 `ch/<id>.html`（每章索引页 + 每一课的静态页）。

---

## 2. 课程表：`curriculum.ts`

课程是三层结构：**部 → 章 → 课**。

```ts
{
  id: 'c03',                       // 章 id，一旦发布永不修改
  title: 'Rust 的形状',
  subtitle: '借用检查如何改写引擎架构',
  goal: '一句话说清这一章学完能做什么。',
  viz: ['ecs'],                    // 可选，章节可视化
  lessons: [
    ['被借用检查改写的那部分架构', 'ready'],  // 已写完
    '一个 Unity 片段',                        // 默认 planned
  ],
}
```

- `id`：`cNN` 形式，由人工指定。**不要重排**：课 id 由 `章 id + 两位序号` 推导（`c03-01`），重排会让所有已发布链接失效。
- `lessons` 里只写标题。id、编号、文件名（`c03-01.mdx`）全部自动生成。
- 状态三种：`ready`（正文已写完）、`writing`（正在写）、`planned`（只有标题）。章的状态由课自动汇总。
- 加课：往 `lessons` 里加一行，然后在 `src/content/` 下建同名 `.mdx`。
- 加章：在对应部里加一个 `ChapterSpec`，编号自动顺延。**新增章请放在所属部末尾**，不要插在中间。

改完课程表，`npm run build` 会自动生成新的章节页和课程列表，不需要手工改任何导航。

---

## 3. 正文：`.mdx`

一课一个文件，第一行是 `# 课标题`（静态页直接用它当 `<h1>`）。正文用中文，术语保留英文原文。

### 3.1 语气与结构

- 可以玩梗（古文、圣经体都行），但**梗不能替代结论**。
- 每课至少要有：一个问题、一段真实代码或一个图表、一个能带走的结论。
- 每课只加几行代码。写不完就拆成两课，不要写「完整实现见下」。
- 不写「显然」「很简单」。读者卡住的地方，正是你要解释的地方。

### 3.2 提示块

```md
:::tip{title="为什么这算生产级"}
内容。
:::
```

可用：`tip` `info` `warn` `danger` `note` `exercise`。`title` 可省略。

### 3.3 代码引用（重点）

引用真实仓库里的代码，**不要手抄**：

````md
```rust ref="prisma:crates/prism-ecs/src/lib.rs#L495-L499"
struct ComponentPool<T> {
    dense: Vec<T>,
    dense_entities: Vec<u32>,
    sparse: Vec<u32>,
}
```
````

规则：

- 格式：`<仓库>:<路径>#L<起>[-L<止>]`。仓库键在 `build/repos.ts` 里定义（`prisma`、`horizon`、`site`）。
- 构建时**以本地 clone 为准**，行号取真实文件，标题栏显示 `仓库 · 路径 · Lx–Ly @ shortsha`，并提供「固定 / 最新 / 历史」三个 GitHub 链接。
- 代码块里写的那份是**缓存副本**：构建机没有 clone 时用它兜底（标题栏标「离线副本」）。缓存和真实文件不一致时构建会警告，但**仍然用真实文件**。
- 想让某几行高亮：加 `lines="3,7-9"`（相对引用块的 1 开始计数）。
- 非引用代码块照常写 ```` ```rust ````，标题可加 `title="…"`。
- 一次引用别超过 60 行。超了用 `details` 折叠是自动的，但读者不会展开。

### 3.4 图表

不用 ASCII 画图，也不用 `→`、`↓` 这类字符拼流程。用 DSL，构建时编译成内联 SVG（颜色走 CSS 变量，深浅色主题都正常）。

**流程图**：

````md
```diagram flow
真实时间 -> 累加器
累加器 -> 余量够一个 tick {diamond}
余量够一个 tick ->|够| 执行一次 tick
余量够一个 tick ->|不够| 丢弃多余时间
```
````

- `A -> B` 建边，`A ->|标签| B` 带边标签。
- 节点形状：默认矩形；`{diamond}` 判定、`{round}` 圆角、`{pill}` 胶囊。
- 布局从左到右。**不要写环**：有环时层级会退化，图会难看。

**路线图**（一行一条链）：

````md
```diagram map
第一部 地基: 造一台算法, 项目骨架, Rust 的形状
第二部 平台: 窗口, 事件, 输入
```
````

条目用英文逗号分隔，超宽自动换行。

### 3.5 图标

**一律 lucide**，禁止 emoji、禁止用字符当图标（`☰`、`✓`、`→` 都不行）。图标在 `src/lib/icons.ts` 里按需 import，用 `icon(ICONS.xxx, 尺寸)` 渲染。正文里表达「因此」请用句子，不要用箭头符号。

---

## 4. 并行写作

多人同时写时，按**章**分工，不按文件分工。

1. 认领一章：在 issue 里写章 id（例如 `c17 图形 API 选型`），拿到确认再动笔。
2. 只改自己的文件：`src/content/c17-*.mdx`。**不要动 `curriculum.ts` 里别人的章**，除非只是更新自己那几课的状态。
3. 章内进度用状态表达：写完一课把 `planned` 改成 `ready`，写一半用 `writing`。
4. 分支命名：`content/c17-device`。一个 PR 只做一章（或一组紧密相关的课）。
5. 提交前必须跑：

   ```sh
   npm run build
   ```

   它会执行 `tsc --noEmit`，并检查每个 `ref=` 是否能解析、缓存副本是否过期。

6. PR 描述里写：章 id、新增/修改了哪些课、有没有动 `curriculum.ts` 之外的文件。

### 评审清单

- [ ] 每课只引入少量新代码，且能单独读懂
- [ ] 代码引用没有手抄成假代码（构建无 `缓存副本已过期` 警告）
- [ ] 图用 DSL，正文没有字符箭头/emoji 图标
- [ ] 术语前后一致；引用的行号指向真实存在的代码
- [ ] `npm run build` 通过，静态页正常生成

---

## 5. 本地环境

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc + vite build，产物在 dist/
npm run preview    # 预览 dist/
```

`build/repos.ts` 里配了三个仓库的本地路径：

| 键 | 仓库 | 用途 |
|---|---|---|
| `prisma` | `prisma-rust/prisma-rev` | 引擎代码引用 |
| `horizon` | `Excurs1ons/horizon` | Rust/ECS 对照代码 |
| `site` | `prisma-rust/prisma-web-tutorial` | 站内自引用 |

路径不存在不会让构建失败：该引用会退回 `.mdx` 里的缓存副本，并标「离线副本」。所以**缓存副本必须和真实代码一致**，否则 CI 上读者看到的可能是旧代码。

---

## 6. 发布

`.github/workflows/pages.yml` 在推送到 `main` 后自动构建并发布到 GitHub Pages。`vite.config.ts` 使用 `base: "./"`，站点可以部署在任意子路径下，不需要改配置。

发布产物包含：

- `index.html`：交互版（侧栏、目录、可视化、主题切换）
- `ch/cNN.html`：章索引页
- `ch/cNN-MM.html`：已写好课程的静态页（可被搜索引擎抓取，也可直接分享）
