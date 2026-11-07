import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './styles.css';
import { ICONS, icon } from './lib/icons';
import {
  CHAPTERS,
  LESSONS,
  PARTS,
  TOTAL_CHAPTERS,
  TOTAL_LESSONS,
  findChapter,
  findLesson,
  lessonPosition,
  type Chapter,
  type Lesson,
} from './content/curriculum';

gsap.registerPlugin(ScrollTrigger);

interface Heading {
  id: string;
  text: string;
  depth: number;
}

interface Compiled {
  default: string;
  title?: string;
  headings?: Heading[];
}

const MODULES = import.meta.glob<Compiled>('./content/*.mdx', { eager: true });

const BY_FILE = new Map<string, Compiled>();
for (const [path, mod] of Object.entries(MODULES)) {
  BY_FILE.set(path.split('/').pop()!, mod);
}

const WRITTEN = new Set(
  Object.keys(MODULES).map((p) => p.split('/').pop()!.replace(/\.mdx$/, '')),
);

const $ = <T extends Element>(sel: string): T => document.querySelector(sel) as T;

let activeTriggers: ScrollTrigger[] = [];
let disposeViz: (() => void)[] = [];
let routeToken = 0;

/* ------------------------------------------------------------------ shell */

function shell() {
  const root = $('#app')!;

  const groups = PARTS.map(
    (part) => `
    <section class="side-group">
      <h2>${part.name}</h2>
      <ol class="chapters">
        ${part.chapters
          .map(
            (ch) => `
          <li class="ch-item" data-chapter="${ch.id}">
            <a class="ch-link" href="#/${ch.id}">
              <span class="ch-caret" data-caret>${icon(ICONS.chevronRight, 14)}</span>
              <span class="ch-num">${ch.num}</span>
              <span class="ch-title">${ch.title}</span>
              <span class="ch-count">${ch.lessons.length}</span>
            </a>
            <ol class="lessons">
              ${ch.lessons
                .map(
                  (l) => `
                <li class="ls-item" data-lesson="${l.id}">
                  <a href="#/${l.id}">
                    <span class="ls-num">${l.num.split('.')[1]}</span>
                    <span class="ls-title">${l.title}</span>
                    <span class="dot ${l.status}"></span>
                  </a>
                </li>`,
                )
                .join('')}
            </ol>
          </li>`,
          )
          .join('')}
      </ol>
    </section>`,
  ).join('');

  root.innerHTML = `
  <div class="backdrop" data-close></div>
  <header class="topbar">
    <button class="icon-btn" id="menu" aria-label="目录">${icon(ICONS.menu, 18)}</button>
    <a class="brand" href="#/${CHAPTERS[0].id}"><span class="mark"></span>PrismaRev<span class="brand-sub">引擎课</span></a>
    <div class="topmeta">
      <span id="chapter-counter"></span>
      <span id="top-note">从零写一台自己的引擎</span>
    </div>
    <div class="top-actions">
      <button class="icon-btn" id="theme" aria-label="切换主题">${icon(ICONS.moon, 17)}</button>
    </div>
  </header>
  <div class="layout">
    <aside class="side" id="side">
      <div class="side-inner">
        <p class="side-lead">${TOTAL_CHAPTERS} 章 · ${TOTAL_LESSONS} 课<br><span>每课只加几行代码</span></p>
        <div class="side-scroll">${groups}</div>
        <p class="side-foot">先读第一课，再决定要不要写完。</p>
      </div>
    </aside>
    <main class="main">
      <article class="prose" id="article"></article>
      <nav class="pager" id="pager"></nav>
    </main>
  </div>
  <button class="toc-btn" id="toc-btn">目录</button>
  <aside class="toc" id="toc"><div class="toc-body" id="toc-body"></div></aside>`;

  // 主题
  const stored = localStorage.getItem('theme');
  const themeBtn = $<HTMLButtonElement>('#theme');
  const apply = (t: string) => {
    document.documentElement.dataset.theme = t;
    themeBtn.innerHTML = t === 'dark' ? icon(ICONS.sun, 17) : icon(ICONS.moon, 17);
  };
  apply(stored ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    apply(next);
  });

  $<HTMLButtonElement>('#menu').addEventListener('click', () =>
    document.body.classList.toggle('side-open'),
  );
  $('#side').addEventListener('click', (e) => {
    const caret = (e.target as Element).closest('[data-caret]');
    if (caret) {
      e.preventDefault();
      caret.closest('.ch-item')?.classList.toggle('open');
      return;
    }
    if ((e.target as Element).closest('a')) document.body.classList.remove('side-open');
  });
  $<HTMLButtonElement>('#toc-btn').addEventListener('click', () =>
    document.body.classList.toggle('toc-open'),
  );
  $('.backdrop').addEventListener('click', () => document.body.classList.remove('side-open'));

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  document.addEventListener('click', onCopy);
  window.addEventListener('hashchange', () => void route());
}

/* ------------------------------------------------------------------ route */

type Route =
  | { kind: 'chapter'; chapter: Chapter }
  | { kind: 'lesson'; lesson: Lesson; chapter: Chapter };

function parseRoute(): Route {
  const raw = location.hash.replace(/^#\/?/, '');
  const lesson = findLesson(raw);
  if (lesson) {
    const chapter = findChapter(lesson.chapter)!;
    return { kind: 'lesson', lesson, chapter };
  }
  const chapter = findChapter(raw);
  if (chapter) return { kind: 'chapter', chapter };
  return { kind: 'chapter', chapter: CHAPTERS[0] };
}

async function route() {
  const token = ++routeToken;
  const r = parseRoute();
  const article = $<HTMLElement>('#article');
  const hedge = $<HTMLElement>('#pager');

  for (const t of activeTriggers) t.kill();
  activeTriggers = [];
  for (const d of disposeViz) d();
  disposeViz = [];
  document.body.classList.remove('toc-open');

  hedge.style.display = '';

  if (r.kind === 'chapter') {
    renderChapterPage(article, r.chapter);
    renderToc([]);
    renderPager(null, r.chapter);
    setActive(r.chapter.id, null);
    $('#chapter-counter').textContent = `第 ${r.chapter.num} 章 / ${TOTAL_CHAPTERS}`;
    document.title = `${r.chapter.num} ${r.chapter.title} · PrismaRev 引擎课`;
    toTop();
    intro();
    return;
  }

  const { lesson, chapter } = r;
  const mod = BY_FILE.get(lesson.file);

  if (!mod) {
    renderPending(article, lesson, chapter);
    renderToc([]);
    renderPager(lesson, chapter);
    setActive(chapter.id, lesson.id);
    $('#chapter-counter').textContent = `第 ${lesson.num} 课 / ${TOTAL_LESSONS}`;
    document.title = `${lesson.num} ${lesson.title} · 待写 · PrismaRev 引擎课`;
    toTop();
    intro();
    return;
  }

  article.innerHTML = mod.default;
  renderToc(mod.headings ?? []);
  renderPager(lesson, chapter);
  setActive(chapter.id, lesson.id);
  $('#chapter-counter').textContent = `第 ${lesson.num} 课 / ${TOTAL_LESSONS}`;
  document.title = `${lesson.num} ${lesson.title} · PrismaRev 引擎课`;

  if (chapter.viz?.length) {
    const { mountViz } = await import('./viz');
    if (token !== routeToken) return;
    for (const key of chapter.viz) {
      const host = document.createElement('div');
      host.className = 'viz-host';
      article.appendChild(host);
      try {
        disposeViz.push(mountViz(key, host));
      } catch (err) {
        host.innerHTML = `<p class="viz-fail">可视化加载失败：${String(err)}</p>`;
      }
    }
  }

  intro();
  toTop();
}

/* ------------------------------------------------------------- chapter page */

function renderChapterPage(article: HTMLElement, ch: Chapter) {
  const written = ch.lessons.filter((l) => WRITTEN.has(l.id)).length;
  const items = ch.lessons
    .map((l) => {
      const has = WRITTEN.has(l.id);
      return `
      <li class="lesson-row ${has ? '' : 'pending'}">
        <a href="#/${l.id}">
          <span class="lr-num">${l.num}</span>
          <span class="lr-main">
            <strong>${l.title}</strong>
            <span class="lr-meta">${has ? '可以阅读' : '仍在打地基'}</span>
          </span>
          <span class="dot ${l.status}"></span>
        </a>
      </li>`;
    })
    .join('');

  article.innerHTML = `
    <p class="kicker">${ch.part} · 第 ${ch.num} 章</p>
    <h1>${ch.title}</h1>
    <p class="lede">${ch.subtitle}</p>
    <p class="goal">${ch.goal}</p>
    <p class="chapter-stat">${ch.lessons.length} 课 · 已写 ${written} 课</p>
    <ol class="lesson-list">${items}</ol>
    <p class="chapter-note">标记为「仍在打地基」的课，内容还在写。点进去可以先看它要解决什么问题。</p>`;
}

function renderPending(article: HTMLElement, l: Lesson, ch: Chapter) {
  const idx = lessonPosition(l.id);
  const next = LESSONS.slice(idx + 1).find((x) => WRITTEN.has(x.id));

  article.innerHTML = `
    <p class="kicker">${ch.part} · 第 ${ch.num} 章 · 第 ${l.num} 课</p>
    <h1>${l.title}</h1>
    <p class="lede">${ch.title} — ${ch.subtitle}</p>
    <div class="callout warn">
      <p class="callout-title">这一课还在打地基</p>
      <p>本课会讲：<strong>${l.title}</strong>。目标是 ${ch.goal}</p>
    </div>
    <p>不想等的话，可以先从<strong>已经写好的课</strong>读起；它们会按顺序把同一块地基打好。</p>
    <p class="pending-actions">
      <a class="static-btn" href="#/${next ? next.id : ch.lessons[0].id}">${
        next ? `跳到 ${next.num} ${next.title}` : '回到本章第一课'
      }${icon(ICONS.arrowRight, 15)}</a>
      <a class="ghost-btn" href="#/${ch.id}">看这一章的完整目录</a>
    </p>`;
}

/* ------------------------------------------------------------------ chrome */

function renderToc(heads: Heading[]) {
  const body = $('#toc-body') as HTMLElement;
  document.body.classList.remove('toc-open');
  document.body.classList.toggle('no-toc', heads.length === 0);

  if (!heads.length) {
    body.innerHTML = '';
    return;
  }

  body.innerHTML = `<ol>${heads
    .map((h) => `<li class="d${h.depth}"><a href="#${h.id}" data-target="${h.id}">${h.text}</a></li>`)
    .join('')}</ol>`;

  const links = [...body.querySelectorAll<HTMLAnchorElement>('a[data-target]')];

  body.onclick = (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>('a[data-target]');
    if (!a) return;
    e.preventDefault();
    document.getElementById(a.dataset.target!)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.body.classList.remove('toc-open');
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const a of links) a.classList.toggle('on', a.dataset.target === entry.target.id);
      }
    },
    { rootMargin: '-10% 0px -75% 0px' },
  );
  for (const h of heads) {
    const el = document.getElementById(h.id);
    if (el) io.observe(el);
  }
  disposeViz.push(() => io.disconnect());
}

function renderPager(lesson: Lesson | null, chapter: Chapter) {
  const nav = $('#pager') as HTMLElement;

  if (!lesson) {
    // 章节页：上一章 / 下一章
    const i = CHAPTERS.findIndex((c) => c.id === chapter.id);
    const prev = CHAPTERS[i - 1];
    const next = CHAPTERS[i + 1];
    nav.innerHTML = [pagerItem(prev, '上一章', 'prev'), pagerItem(next, '下一章', 'next')].join('');
    return;
  }

  const i = LESSONS.findIndex((l) => l.id === lesson.id);
  const prev = LESSONS[i - 1];
  const next = LESSONS[i + 1];
  nav.innerHTML = [
    pagerItem(prev, '上一课', 'prev'),
    pagerItem(next, '下一课', 'next'),
  ].join('');
}

function pagerItem(l: Lesson | Chapter | undefined, label: string, cls: string): string {
  if (!l) return '<span></span>';
  const id = 'chapter' in l ? l.id : l.id;
  const num = l.num;
  return `<a class="pg ${cls}" href="#/${id}"><span>${label}</span><strong>${num} ${l.title}</strong></a>`;
}

function setActive(chapterId: string, lessonId: string | null) {
  for (const li of document.querySelectorAll<HTMLElement>('.ch-item')) {
    const on = li.dataset.chapter === chapterId;
    li.classList.toggle('on', on);
    li.classList.toggle('open', on);
  }
  for (const li of document.querySelectorAll<HTMLElement>('.ls-item')) {
    li.classList.toggle('on', li.dataset.lesson === lessonId);
  }
  const active = document.querySelector('.ch-item.on');
  active?.scrollIntoView({ block: 'nearest' });
}

function toTop() {
  window.scrollTo(0, 0);
  // 字体和懒加载的块会改变文档高度，浏览器也会在 hash 变化后恢复上次的滚动位置。
  // 下一帧再压一次，才压得住。
  requestAnimationFrame(() => window.scrollTo(0, 0));
}

function intro() {
  const article = document.getElementById('article');
  if (!article) return;

  gsap.fromTo(
    article,
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: 0.36, ease: 'power2.out', clearProps: 'opacity,transform' },
  );

  for (const el of article.querySelectorAll<HTMLElement>(
    '.prose > h2, .prose > p, .prose > figure, .prose > .callout, .lesson-list > li',
  )) {
    const tween = gsap.from(el, {
      y: 16,
      opacity: 0,
      duration: 0.4,
      ease: 'power2.out',
      clearProps: 'opacity,transform',
      scrollTrigger: { trigger: el, start: 'top 94%', once: true },
      onComplete: () => tween.scrollTrigger?.kill(),
    });
    if (tween.scrollTrigger) activeTriggers.push(tween.scrollTrigger);
  }
}

function onCopy(e: MouseEvent) {
  const btn = (e.target as Element).closest<HTMLButtonElement>('.cb-copy');
  if (!btn) return;
  const code = decodeURIComponent(btn.dataset.code ?? '');
  const label = btn.querySelector('.cb-copy-t') ?? btn;
  void navigator.clipboard.writeText(code).then(() => {
    const old = label.textContent;
    label.textContent = '已复制';
    btn.classList.add('ok');
    setTimeout(() => {
      label.textContent = old ?? '复制';
      btn.classList.remove('ok');
    }, 1400);
  });
}

/* -------------------------------------------------------------------- boot */

const root = document.getElementById('app');
if (root) {
  shell();
  void route();
} else {
  // 静态页：没有 #app，只把主题恢复一下
  const stored = localStorage.getItem('theme');
  document.documentElement.dataset.theme =
    stored ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
