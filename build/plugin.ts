import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { renderContent } from './content';
import { CHAPTERS, PARTS, type Chapter, type Lesson } from '../src/content/curriculum';

const CONTENT_DIR = resolve(process.cwd(), 'src/content');

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function compile(file: string) {
  const source = await readFile(resolve(CONTENT_DIR, file), 'utf8');
  return renderContent(source, file);
}

function lessonList(ch: Chapter): string {
  const items = ch.lessons
    .map((l) => {
      const has = existsSync(resolve(CONTENT_DIR, l.file));
      const href = has ? `./${l.id}.html` : `../index.html#/${l.id}`;
      const dot = `<span class="dot ${l.status}" title="${l.status}"></span>`;
      return `<li class="${has ? '' : 'pending'}">${dot}<a href="${href}"><span class="ln">${l.num}</span><span class="lt">${escapeHtml(l.title)}</span></a></li>`;
    })
    .join('');
  return `<ol class="static-lessons">${items}</ol>`;
}

function sideNav(activeChapter?: string): string {
  const groups = PARTS.map((p) => {
    const items = p.chapters
      .map((c) => {
        const on = c.id === activeChapter ? ' class="active"' : '';
        return `<li${on}><a href="./${c.id}.html"><span class="n">${c.num}</span><span>${escapeHtml(c.title)}</span></a></li>`;
      })
      .join('');
    return `<div class="static-group"><p>${escapeHtml(p.name)}</p><ol>${items}</ol></div>`;
  }).join('');
  return `<aside class="static-side"><a class="static-brand" href="../index.html">PrismaRev<span>引擎课</span></a>${groups}</aside>`;
}

function shell(opts: {
  title: string;
  description: string;
  body: string;
  activeChapter?: string;
}): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.title)}</title>
<meta name="description" content="${escapeHtml(opts.description)}">
<link rel="stylesheet" href="../__CSS__">
</head>
<body class="static-page">
<div class="static-shell">
${sideNav(opts.activeChapter)}
<main class="static-main">
${opts.body}
</main>
</div>
<script type="module" src="../__ENTRY__"></script>
</body>
</html>`;
}

export function mdxPlugin(): Plugin {
  let entryFile = '';
  let cssFile = '';

  return {
    name: 'prisma-mdx',
    enforce: 'pre',

    async transform(_code, id) {
      if (!id.endsWith('.mdx')) return null;
      const file = id.split(/[\\/]/).pop()!;
      const { html, title, headings, warnings } = await compile(file);
      for (const w of warnings) this.warn(`  [content] ${file}: ${w}`);
      return {
        code: [
          `export const title = ${JSON.stringify(title)};`,
          `export const headings = ${JSON.stringify(headings)};`,
          `export default ${JSON.stringify(html)};`,
        ].join('\n'),
        map: null,
      };
    },

    async generateBundle(_options, bundle) {
      for (const [name, out] of Object.entries(bundle)) {
        if (out.type !== 'asset' && out.isEntry) entryFile = name;
        if (out.type === 'asset' && name.endsWith('.css')) cssFile = name;
      }
      const entry = entryFile.replace(/\\/g, '/');
      const css = cssFile.replace(/\\/g, '/');
      const fill = (html: string) =>
        html.replace('__CSS__', css).replace('__ENTRY__', entry);

      const emit = (name: string, html: string) => {
        this.emitFile({ type: 'asset', fileName: name, source: fill(html) });
      };

      for (const ch of CHAPTERS) {
        // 章节索引页
        const start = ch.lessons.find((l) => existsSync(resolve(CONTENT_DIR, l.file)));
        const startHref = start ? `./${start.id}.html` : `../index.html#/${ch.lessons[0].id}`;
        emit(
          `ch/${ch.id}.html`,
          shell({
            title: `${ch.num} ${ch.title} · PrismaRev 引擎课`,
            description: ch.subtitle,
            activeChapter: ch.id,
            body: `
<p class="static-kicker">${escapeHtml(ch.part)} · 第 ${ch.num} 章</p>
<h1>${escapeHtml(ch.title)}</h1>
<p class="static-sub">${escapeHtml(ch.subtitle)}</p>
<p class="static-goal">${escapeHtml(ch.goal)}</p>
${lessonList(ch)}
<p class="static-cta"><a class="static-btn" href="${startHref}">开始这一章 →</a></p>`,
          }),
        );

        // 该章已写好的课
        for (let i = 0; i < ch.lessons.length; i++) {
          const l = ch.lessons[i];
          if (!existsSync(resolve(CONTENT_DIR, l.file))) continue;
          const { html, warnings } = await compile(l.file);
          for (const w of warnings) this.warn(`  [content] ${l.file}: ${w}`);
          emit(
            `ch/${l.id}.html`,
            shell({
              title: `${l.num} ${l.title} · PrismaRev 引擎课`,
              description: ch.subtitle,
              activeChapter: ch.id,
              body: `
<p class="static-kicker">${escapeHtml(ch.part)} · 第 ${ch.num} 章 · 第 ${l.num} 课</p>
<article class="prose">${html}</article>
<nav class="static-pager">
${pagerLink(ch.lessons[i - 1], '上一课', 'prev')}
${pagerLink(ch.lessons[i + 1], '下一课', 'next')}
</nav>
<p class="static-cta"><a href="../index.html#/${l.id}">在交互版里打开这一课 →</a></p>`,
            }),
          );
        }
      }
    },
  };
}

function pagerLink(l: Lesson | undefined, label: string, cls: string): string {
  if (!l) return '<span></span>';
  const has = existsSync(resolve(CONTENT_DIR, l.file));
  const href = has ? `./${l.id}.html` : `../index.html#/${l.id}`;
  return `<a class="${cls}" href="${href}"><span>${label}</span><strong>${l.num} ${escapeHtml(l.title)}</strong></a>`;
}
