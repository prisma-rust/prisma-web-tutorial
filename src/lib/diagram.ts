// 小型图表渲染器:把 DSL 编译成内联 SVG。
//
// 为什么不用 Mermaid:它需要 DOM(构建时就得拖一个 jsdom + DOMPurify),
// 而且颜色是烧进 SVG 的,深色主题会翻车。这里只画引擎文档需要的两类图,
// 颜色全部走 CSS 变量,构建期产出静态 SVG,运行时零成本。

type Shape = 'box' | 'diamond' | 'round' | 'pill';

interface Node {
  id: string;
  label: string;
  shape: Shape;
  rank: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Edge {
  from: string;
  to: string;
  label?: string;
}

const PAD = 10;
const GAP_X = 56;
const GAP_Y = 22;

/** 粗略量宽:CJK 按全角算,ASCII 按 0.56 倍。够用,不需要 canvas。 */
function textWidth(s: string, size: number): number {
  let w = 0;
  for (const ch of s) w += /[\u3000-\u9fff\uff00-\uffef]/.test(ch) ? size : size * 0.56;
  return w;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function parseShape(label: string): { label: string; shape: Shape } {
  const m = label.match(/^(.*?)\s*\{(\w+)\}$/);
  if (!m) return { label: label.trim(), shape: 'box' };
  const shape = ({ diamond: 'diamond', round: 'round', pill: 'pill' } as Record<string, Shape>)[m[2]] ?? 'box';
  return { label: m[1].trim(), shape };
}

function sizeFor(label: string, shape: Shape): { w: number; h: number } {
  const size = 13;
  const w = Math.max(shape === 'diamond' ? 130 : 84, textWidth(label, size) + (shape === 'diamond' ? 56 : 28));
  const h = shape === 'diamond' ? 62 : 40;
  return { w, h };
}

/* --------------------------------------------------------------- flowchart */

function flow(body: string): string {
  const nodes = new Map<string, Node>();
  const edges: Edge[] = [];

  const ensure = (raw: string): string => {
    const { label, shape } = parseShape(raw);
    if (!nodes.has(label)) {
      nodes.set(label, { id: label, label, shape, rank: 0, x: 0, y: 0, ...sizeFor(label, shape) });
    }
    return label;
  };

  for (const line of body.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^(.+?)\s*->\s*(?:\|([^|]*)\|\s*)?(.+)$/);
    if (!m) continue;
    const from = ensure(m[1]);
    const to = ensure(m[3]);
    edges.push({ from, to, label: m[2]?.trim() || undefined });
  }

  if (!nodes.size) return '';

  // 最长路径定层级;有环时靠迭代上限兜底。
  for (let i = 0; i < nodes.size; i++) {
    let changed = false;
    for (const e of edges) {
      const a = nodes.get(e.from)!;
      const b = nodes.get(e.to)!;
      if (b.rank < a.rank + 1) {
        b.rank = a.rank + 1;
        changed = true;
      }
    }
    if (!changed) break;
  }

  const ranks: Node[][] = [];
  for (const n of nodes.values()) (ranks[n.rank] ??= []).push(n);

  const colW = ranks.map((col) => Math.max(...col.map((n) => n.w)));
  const colH = ranks.map((col) => col.reduce((h, n) => h + n.h, 0) + GAP_Y * (col.length - 1));
  const totalW = colW.reduce((a, b) => a + b, 0) + GAP_X * (ranks.length - 1);
  const totalH = Math.max(...colH);

  let x = PAD;
  ranks.forEach((col, ci) => {
    let y = PAD + (totalH - colH[ci]) / 2;
    for (const n of col) {
      n.x = x + (colW[ci] - n.w) / 2;
      n.y = y;
      y += n.h + GAP_Y;
    }
    x += colW[ci] + GAP_X;
  });

  const w = totalW + PAD * 2;
  const h = totalH + PAD * 2;

  const marker = 'dg-arrow';
  const parts: string[] = [];
  parts.push(
    `<defs><marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="context-stroke"/></marker></defs>`,
  );

  for (const e of edges) {
    const a = nodes.get(e.from)!;
    const b = nodes.get(e.to)!;
    const x1 = a.x + a.w;
    const y1 = a.y + a.h / 2;
    const x2 = b.x;
    const y2 = b.y + b.h / 2;
    const dx = Math.max(24, (x2 - x1) * 0.55);
    parts.push(
      `<path class="dg-edge" d="M${x1} ${y1} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}" marker-end="url(#${marker})"/>`,
    );
    if (e.label) {
      const lx = (x1 + x2) / 2;
      const ly = (y1 + y2) / 2;
      const tw = textWidth(e.label, 11) + 12;
      parts.push(
        `<rect class="dg-tag-bg" x="${lx - tw / 2}" y="${ly - 11}" width="${tw}" height="20" rx="10"/>` +
          `<text class="dg-tag" x="${lx}" y="${ly + 3}" text-anchor="middle">${esc(e.label)}</text>`,
      );
    }
  }

  for (const n of nodes.values()) {
    const cx = n.x + n.w / 2;
    const cy = n.y + n.h / 2;
    if (n.shape === 'diamond') {
      parts.push(
        `<polygon class="dg-shape" points="${cx},${n.y} ${n.x + n.w},${cy} ${cx},${n.y + n.h} ${n.x},${cy}"/>`,
      );
    } else {
      const r = n.shape === 'box' ? 6 : n.h / 2;
      parts.push(`<rect class="dg-shape" x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="${r}"/>`);
    }
    parts.push(`<text class="dg-label" x="${cx}" y="${cy + 4.5}" text-anchor="middle">${esc(n.label)}</text>`);
  }

  return `<svg class="dg-svg" viewBox="0 0 ${Math.round(w)} ${Math.round(h)}" width="100%" role="img">${parts.join('')}</svg>`;
}

/* ------------------------------------------------------------------- map */

function map(body: string): string {
  const rows = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));

  const maxW = 720;
  const labelW = 92;
  const itemH = 28;
  const gap = 20;
  const lineGap = 12;
  const parts: string[] = [];

  let y = PAD;
  let width = maxW;

  for (const row of rows) {
    const m = row.match(/^([^:]+):\s*(.+)$/);
    if (!m) continue;
    const label = m[1].trim();
    const items = m[2].split(',').map((s) => s.trim()).filter(Boolean);

    parts.push(
      `<text class="dg-row-label" x="${PAD}" y="${y + itemH / 2 + 4}">${esc(label)}</text>`,
    );

    let x = PAD + labelW;
    let lineY = y;

    items.forEach((item, i) => {
      const iw = Math.max(56, textWidth(item, 12) + 24);
      if (x + iw > maxW) {
        x = PAD + labelW;
        lineY += itemH + lineGap;
      }
      parts.push(
        `<rect class="dg-pill" x="${x}" y="${lineY}" width="${iw}" height="${itemH}" rx="${itemH / 2}"/>` +
          `<text class="dg-pill-label" x="${x + iw / 2}" y="${lineY + itemH / 2 + 4}" text-anchor="middle">${esc(item)}</text>`,
      );
      x += iw;

      if (i < items.length - 1) {
        const nextW = Math.max(56, textWidth(items[i + 1], 12) + 24);
        if (x + gap + nextW > maxW) {
          x = PAD + labelW;
          lineY += itemH + lineGap;
        } else {
          parts.push(
            `<path class="dg-edge" d="M${x + 3} ${lineY + itemH / 2} L${x + gap - 6} ${lineY + itemH / 2}" marker-end="url(#dg-arrow)"/>`,
          );
          x += gap;
        }
      }
    });

    y = lineY + itemH + 22;
    width = Math.max(width, x + PAD);
  }

  const h = y + PAD;
  const marker = 'dg-arrow';

  return (
    `<svg class="dg-svg" viewBox="0 0 ${Math.round(width)} ${Math.round(h)}" width="100%" role="img">` +
    `<defs><marker id="${marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="context-stroke"/></marker></defs>` +
    parts.join('') +
    `</svg>`
  );
}

/* ----------------------------------------------------------------- entry */

export function renderDiagram(kind: string, body: string): string {
  const svg = kind === 'map' ? map(body) : flow(body);
  if (!svg) return '';
  return `<figure class="dg dg-${kind === 'map' ? 'map' : 'flow'}">${svg}</figure>`;
}
