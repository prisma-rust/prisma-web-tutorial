// 图标一律来自 lucide,不用字符画。
// 只 import 用得到的节点,Lucide 的 ESM 导出会被 tree-shake 掉。
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  GitBranch,
  History,
  Menu,
  Moon,
  Pin,
  Sun,
} from 'lucide';

export type IconNode = readonly unknown[];

function attrs(map: Record<string, string | number>): string {
  return Object.entries(map)
    .map(([k, v]) => `${k}="${String(v)}"`)
    .join(' ');
}

/** 把一个 lucide 图标节点渲染成内联 SVG 字符串。 */
export function icon(node: IconNode, size = 16, cls = ''): string {
  const body = node
    .map((child) => {
      const [tag, map] = child as unknown as [string, Record<string, string | number>];
      return `<${tag} ${attrs(map)} />`;
    })
    .join('');
  return (
    `<svg class="ic${cls ? ` ${cls}` : ''}" width="${size}" height="${size}" ` +
    `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ` +
    `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
  );
}

export const ICONS = {
  menu: Menu as unknown as IconNode,
  moon: Moon as unknown as IconNode,
  sun: Sun as unknown as IconNode,
  chevronRight: ChevronRight as unknown as IconNode,
  chevronLeft: ChevronLeft as unknown as IconNode,
  check: Check as unknown as IconNode,
  copy: Copy as unknown as IconNode,
  pin: Pin as unknown as IconNode,
  branch: GitBranch as unknown as IconNode,
  history: History as unknown as IconNode,
  arrowRight: ArrowRight as unknown as IconNode,
};
