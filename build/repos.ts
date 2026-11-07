// 站点构建期的仓库映射。
// 本地有 clone 时用真实文件 + 真实 commit；没有 clone（例如 CI）时，
// 退回到 .mdx 里缓存的代码副本，仍然生成正确的 GitHub 链接。
export interface RepoSpec {
  owner: string;
  name: string;
  /** 本地 clone 的绝对路径；不存在时构建会使用 md 里缓存的代码。 */
  local: string;
  /** 默认分支，用于「看最新」按钮。 */
  branch: string;
}

export const REPOS: Record<string, RepoSpec> = {
  prisma: {
    owner: "prisma-rust",
    name: "prisma-rev",
    local: "F:/repos/prisma/prisma-rev",
    branch: "main",
  },
  horizon: {
    owner: "Excurs1ons",
    name: "horizon",
    local: "F:/repos/horizon",
    branch: "main",
  },
  site: {
    owner: "prisma-rust",
    name: "prisma-web-tutorial",
    local: "F:/repos/prisma/prisma-web-tutorial",
    branch: "main",
  },
};
