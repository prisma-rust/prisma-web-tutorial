import { readFileSync } from "node:fs";

const REPOS = {
  prisma: "F:/repos/prisma/prisma-rev",
  horizon: "F:/repos/horizon",
};

const mdx = readFileSync("src/content/01-intro.mdx", "utf8");
const fence = /```[a-z]*\s+ref="([^"]+)"\n([\s\S]*?)```/g;

function slice(text, start, end) {
  const lines = text.split(/\r?\n/);
  return lines.slice(start - 1, end ?? start).join("\n");
}

for (const m of mdx.matchAll(fence)) {
  const spec = m[1];
  const cached = m[2].trim();
  const [, key, file, a0, b0] = spec.match(/^(\w+):([^#]+)(?:#L(\d+)(?:-L(\d+))?)?$/);
  const a = Number(a0 ?? 1);
  const b = Number(b0 ?? a0 ?? 1);
  const real = slice(readFileSync(`${REPOS[key]}/${file}`, "utf8"), a, b).trim();
  const same = real === cached;
  console.log(`${spec}  ${same ? "OK" : "DIFF"}  (cached ${cached.split("\n").length} 行, real ${real.split("\n").length} 行)`);
  if (!same) {
    const cl = cached.split("\n");
    const rl = real.split("\n");
    for (let i = 0; i < Math.max(cl.length, rl.length); i++) {
      if (cl[i] !== rl[i]) {
        console.log(`  first diff at line ${i + 1}`);
        console.log(`  cached: ${JSON.stringify(cl[i])}`);
        console.log(`  real  : ${JSON.stringify(rl[i])}`);
        break;
      }
    }
  }
}
