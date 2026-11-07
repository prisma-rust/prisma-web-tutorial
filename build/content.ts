/**
 * .mdx -> HTML 的构建期编译器。
 *
 * 设计要点：
 * - 浏览器只拿到已经渲染好的 HTML 字符串，不再带 markdown-it / 高亮器。
 * - 代码块可以用 ref="repo:path#L10-L20" 直接引用真实仓库文件。
 * - 本地有 clone 时读真实文件（并检测与缓存副本的漂移）；
 *   没有 clone 时退回 .mdx 里缓存的副本，链接依然指向正确的 GitHub 行号。
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { createHighlighter, type Highlighter } from "shiki";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import { ICONS, icon } from "../src/lib/icons";
import { renderDiagram } from "../src/lib/diagram";

import { REPOS } from "./repos";

/* ------------------------------------------------------------------ */
/* shiki                                                               */
/* ------------------------------------------------------------------ */

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  highlighterPromise ??= createHighlighter({
    themes: ["github-dark-default", "github-light-default"],
    langs: [
      "rust",
      "toml",
      "bash",
      "json",
      "typescript",
      "javascript",
      "wgsl",
      "glsl",
      "hlsl",
      "cpp",
      "diff",
      "markdown",
      "xml",
    ],
    langAlias: {
      slang: "hlsl",
      vert: "glsl",
      frag: "glsl",
      rs: "rust",
      sh: "bash",
    },
  });
  return highlighterPromise;
}

/* ------------------------------------------------------------------ */
/* git 辅助（带缓存）                                                   */
/* ------------------------------------------------------------------ */

const shaCache = new Map<string, string>();
const dirtyCache = new Map<string, boolean>();

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function repoHead(local: string): string {
  const cached = shaCache.get(local);
  if (cached) return cached;
  let sha = "";
  try {
    sha = git(local, ["rev-parse", "--short=8", "HEAD"]);
  } catch {
    sha = "";
  }
  shaCache.set(local, sha);
  return sha;
}

function isDirty(local: string, file: string): boolean {
  const key = `${local}/${file}`;
  const cached = dirtyCache.get(key);
  if (cached !== undefined) return cached;
  let dirty = false;
  try {
    dirty = git(local, ["status", "--porcelain", "--", file]).length > 0;
  } catch {
    dirty = false;
  }
  dirtyCache.set(key, dirty);
  return dirty;
}

/* ------------------------------------------------------------------ */
/* 代码块                                                              */
/* ------------------------------------------------------------------ */

interface RefTarget {
  repoKey: string;
  file: string;
  start?: number;
  end?: number;
  sha: string;
  dirty: boolean;
  online: boolean;
}

function parseRef(spec: string): { repoKey: string; file: string; start?: number; end?: number } | null {
  const m = /^([a-z][\w-]*):([^#]+)(?:#L(\d+)(?:-L(\d+))?)?$/i.exec(spec.trim());
  if (!m) return null;
  const start = m[3] ? Number(m[3]) : undefined;
  const end = m[4] ? Number(m[4]) : start;
  return { repoKey: m[1].toLowerCase(), file: m[2].replace(/^\/+/, ""), start, end };
}

function resolveRef(spec: string): RefTarget | null {
  const parsed = parseRef(spec);
  if (!parsed) return null;
  const repo = REPOS[parsed.repoKey];
  if (!repo) return null;
  const local = path.join(repo.local, parsed.file);
  const online = existsSync(local);
  const sha = online ? repoHead(repo.local) : "";
  const dirty = online ? isDirty(repo.local, parsed.file) : false;
  return { ...parsed, sha, dirty, online };
}

function sliceLines(text: string, start?: number, end?: number): string {
  if (start === undefined) return text.replace(/\s+$/, "");
  const lines = text.split(/\r?\n/);
  return lines.slice(start - 1, end ?? start).join("\n").replace(/\s+$/, "");
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function githubUrl(repoKey: string, file: string, rev: string, start?: number, end?: number): string {
  const repo = REPOS[repoKey];
  const base = `https://github.com/${repo.owner}/${repo.name}`;
  const frag = start ? `#L${start}${end && end !== start ? `-L${end}` : ""}` : "";
  return `${base}/blob/${rev}/${file}${frag}`;
}

interface FenceOptions {
  lang: string;
  code: string;
  title?: string;
  ref?: RefTarget;
  highlight?: string;
  offset: number;
}

function highlightHtml(code: string, lang: string, offset: number, highlight?: string): Promise<string> {
  return getHighlighter().then((hl) => {
    const ranges = parseRanges(highlight);
    const known = hl.getLoadedLanguages().includes(lang);
    const html = hl.codeToHtml(code, {
      lang: known ? lang : "text",
      themes: { light: "github-light-default", dark: "github-dark-default" },
      defaultColor: false,
      transformers: [
        {
          line(node, line) {
            node.properties["data-line"] = String(line + offset - 1);
            if (ranges.some(([a, b]) => line >= a && line <= b)) {
              node.properties["data-hl"] = "1";
            }
          },
        },
      ],
    });
    return html;
  });
}

function parseRanges(spec?: string): Array<[number, number]> {
  if (!spec) return [];
  return spec.split(",").flatMap((part) => {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part.trim());
    if (!m) return [];
    const a = Number(m[1]);
    const b = m[2] ? Number(m[2]) : a;
    return [[a, b] as [number, number]];
  });
}

async function renderFence(opts: FenceOptions): Promise<string> {
  const { lang, code, title, ref, highlight, offset } = opts;
  const shiki = await highlightHtml(code, lang, offset, highlight);
  const lineCount = code.split('\n').length;

  const langChip = `<span class="cb-lang">${esc(lang.toUpperCase())}</span>`;
  let top = "";
  let path = "";

  if (ref) {
    const repo = REPOS[ref.repoKey];
    const range = ref.start ? `L${ref.start}${ref.end && ref.end !== ref.start ? `–L${ref.end}` : ""}` : "";
    const rev = ref.sha || repo.branch;
    const pinned = githubUrl(ref.repoKey, ref.file, rev, ref.start, ref.end);
    const latest = githubUrl(ref.repoKey, ref.file, repo.branch, ref.start, ref.end);
    const history = `https://github.com/${repo.owner}/${repo.name}/commits/${repo.branch}/${ref.file}`;
    const repoUrl = `https://github.com/${repo.owner}/${repo.name}`;
    const note = !ref.online
      ? `<span class="cb-note" title="构建机上没有这个仓库的 clone，展示的是 .mdx 中缓存的副本">离线副本</span>`
      : ref.dirty
        ? `<span class="cb-note" title="本地文件有未提交修改，GitHub 上的版本可能不同">本地有改动</span>`
        : "";

    // 第一行：仓库、行号、提交；第二行：完整路径。
    // 路径不在第一行跟仓库抢宽度，长路径就永远不会被省略号吃掉。
    top =
      `<a class="cb-repo" href="${repoUrl}" target="_blank" rel="noreferrer">${esc(repo.owner)}/${esc(repo.name)}</a>` +
      `<span class="cb-meta">${esc(range)}${range ? " · " : ""}@ ${esc(rev)}</span>` +
      note +
      `<span class="cb-actions">` +
      `<a class="cb-btn" href="${pinned}" target="_blank" rel="noreferrer" title="打开当前提交的固定版本">${icon(ICONS.pin, 13)}<span>固定</span></a>` +
      `<a class="cb-btn" href="${latest}" target="_blank" rel="noreferrer" title="打开默认分支上的最新版本">${icon(ICONS.branch, 13)}<span>最新</span></a>` +
      `<a class="cb-btn" href="${history}" target="_blank" rel="noreferrer" title="查看这个文件的提交历史">${icon(ICONS.history, 13)}<span>历史</span></a>` +
      `</span>`;
    path = `<a class="cb-file" href="${pinned}" target="_blank" rel="noreferrer" title="${esc(ref.file)}">${esc(ref.file)}</a>`;
  } else if (title) {
    top = `<span class="cb-file cb-file-inline">${esc(title)}</span>`;
  }

  const copy =
    `<button class="cb-copy" data-code="${encodeURIComponent(code)}" type="button">` +
    `${icon(ICONS.copy, 12)}<span class="cb-copy-t">复制</span></button>`;

  const head = path
    ? `<div class="cb-row cb-row-top">${langChip}${top}</div>` +
      `<div class="cb-row cb-row-path">${path}${copy}</div>`
    : `<div class="cb-row cb-row-top">${langChip}${top}${copy}</div>`;

  const body = `<div class="cb-body">${shiki}</div>`;
  const wrapped =
    lineCount > 46
      ? `<details class="cb-details">${body}<summary>展开全部 ${lineCount} 行</summary></details>`
      : body;

  return `<figure class="cb${ref ? " cb-ref" : ""}">` +
    `<figcaption class="cb-head">${head}</figcaption>` +
    wrapped +
    `</figure>`;
}


/* ------------------------------------------------------------------ */
/* remark 插件                                                         */
/* ------------------------------------------------------------------ */

const CALLOUTS: Record<string, { label: string }> = {
  tip: { label: "提示" },
  info: { label: "说明" },
  warn: { label: "注意" },
  danger: { label: "警告" },
  note: { label: "旁注" },
  exercise: { label: "动手练习" },
};

function remarkCallouts() {
  return (tree: any) => {
    visit(tree, "containerDirective", (node: any) => {
      const kind = String(node.name || "").toLowerCase();
      const spec = CALLOUTS[kind];
      if (!spec) return;
      const title = node.attributes?.title || spec.label;
      node.data = {
        hName: "div",
        hProperties: { className: ["callout", kind] },
      };
      node.children.unshift({
        type: "paragraph",
        data: { hName: "p", hProperties: { className: ["callout-title"] } },
        children: [{ type: "text", value: title }],
      });
    });
  };
}

function remarkCodeBlocks(options: { warnings: string[] }) {
  const { warnings } = options;
  return async (tree: any, file: any) => {
    const nodes: any[] = [];
    visit(tree, "code", (node: any) => {
      nodes.push(node);
    });

    for (const node of nodes) {
      const meta: string = node.meta || "";
      const attrs: Record<string, string> = {};
      for (const m of meta.matchAll(/(\w+)=("([^"]*)"|(\S+))/g)) {
        attrs[m[1]] = (m[3] ?? m[4] ?? "").trim();
      }

      const lang = (node.lang || "text").toLowerCase();

      if (lang === "diagram") {
        node.type = "html";
        node.value = renderDiagram((node.meta || "flow").trim(), node.value ?? "");
        delete (node as any).children;
        continue;
      }
      const cached: string = node.value ?? "";
      let code = cached;
      let offset = 1;
      let target: RefTarget | null = null;

      if (attrs.ref) {
        target = resolveRef(attrs.ref);
        if (!target) {
          warnings.push(`${file.path}: 无法解析 ref="${attrs.ref}"`);
        } else if (target.online) {
          const full = readFileSync(path.join(REPOS[target.repoKey].local, target.file), "utf8");
          const real = sliceLines(full, target.start, target.end);
          if (cached.trim() && real.trim() !== cached.trim()) {
            warnings.push(
              `${file.path}: ref="${attrs.ref}" 的缓存副本已过期，已改用真实文件（请更新 .mdx 中的副本内容）`,
            );
          }
          code = real;
          offset = target.start ?? 1;
        } else if (!cached.trim()) {
          warnings.push(
            `${file.path}: ref="${attrs.ref}" 指向的仓库不在本机，且 .mdx 没有缓存代码，输出为空`,
          );
        }
      }

      const html = await renderFence({
        lang,
        code,
        title: attrs.title,
        ref: target,
        highlight: attrs.lines,
        offset,
      });
      node.type = "html";
      node.value = html;
      delete (node as any).children;
    }
  };
}

/* ------------------------------------------------------------------ */
/* 对外入口                                                            */
/* ------------------------------------------------------------------ */

function createProcessor(warnings: string[]) {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkDirective)
    .use(remarkCallouts)
    .use(remarkCodeBlocks, { warnings })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeSlug)
    .use(rehypeStringify, { allowDangerousHtml: true });
}

export interface RenderResult {
  html: string;
  title: string | null;
  headings: Array<{ id: string; text: string; depth: number }>;
  warnings: string[];
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export async function renderContent(source: string, filename: string): Promise<RenderResult> {
  const warnings: string[] = [];
  const processor = createProcessor(warnings);
  const file = await processor.process({ path: filename, value: source });
  const html = String(file);

  const headings: Array<{ id: string; text: string; depth: number }> = [];
  const re = /<h([23]) id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
  for (const m of html.matchAll(re)) {
    headings.push({ depth: Number(m[1]), id: m[2], text: stripTags(m[3]) });
  }
  const first = headings[0] ?? null;
  return { html, title: first?.text ?? null, headings, warnings };
}
