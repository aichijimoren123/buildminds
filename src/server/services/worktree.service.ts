import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import type {
  WorkTree,
  WorkTreeStatus,
  ChangesStats,
} from "../database/schema";
import { WorkTreeRepository } from "../repositories/worktree.repository";
import { GithubRepoRepository } from "../repositories/github-repo.repository";

const execAsync = promisify(exec);

export interface FileChange {
  path: string;
  status: "added" | "modified" | "deleted";
  additions: number;
  deletions: number;
}

export interface CreateWorkTreeOptions {
  workspaceId: string;
  sessionId: string;
  taskName: string;
  baseBranch?: string;
}

export class WorkTreeService {
  constructor(
    private worktreeRepo: WorkTreeRepository,
    private workspaceRepo: GithubRepoRepository,
  ) {}

  /**
   * 获取 base repo path（从环境变量或默认值）
   */
  private getBaseRepoPath(): string {
    const basePath =
      process.env.GITHUB_REPOS_PATH ||
      path.join(process.cwd(), "..", "claude-repos");
    // 确保返回绝对路径
    return path.resolve(basePath);
  }

  /**
   * 获取仓库根目录路径
   * 结构: baseRepoPath/owner-repo/
   */
  private getRepoRootPath(repoFullName: string): string {
    return path.join(this.getBaseRepoPath(), repoFullName.replace("/", "-"));
  }

  /**
   * 获取 bare repository 路径
   * 结构: baseRepoPath/owner-repo/.bare
   */
  private getBareRepoPath(repoFullName: string): string {
    return path.join(this.getRepoRootPath(repoFullName), ".bare");
  }

  /**
   * 为新会话创建 WorkTree
   */
  async createForSession(options: CreateWorkTreeOptions): Promise<WorkTree> {
    const { workspaceId, sessionId, taskName, baseBranch } = options;

    const workspace = await this.workspaceRepo.findById(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const branch = baseBranch || workspace.branch;
    const branchName = `buildminds/task-${sessionId.slice(0, 8)}`;

    // 新结构：worktree 在仓库根目录下，与 main 平级
    const repoRootPath = this.getRepoRootPath(workspace.repoFullName);
    const bareRepoPath = this.getBareRepoPath(workspace.repoFullName);
    const worktreePath = path.join(repoRootPath, `task-${sessionId.slice(0, 8)}`);

    // 创建 git worktree（在 bare repo 中执行）
    try {
      await execAsync(
        `git worktree add -b "${branchName}" "${worktreePath}" "${branch}"`,
        { cwd: bareRepoPath },
      );
    } catch (error) {
      throw new Error(`Failed to create git worktree: ${error}`);
    }

    // 保存到数据库
    const worktree = await this.worktreeRepo.create({
      id: sessionId, // 使用相同 ID 简化关联
      workspaceId,
      name: taskName,
      branchName,
      localPath: worktreePath,
      baseBranch: branch,
      status: "active",
    });

    return worktree;
  }

  /**
   * 获取 WorkTree
   */
  async getById(id: string): Promise<WorkTree | null> {
    return this.worktreeRepo.findById(id);
  }

  /**
   * 获取 Workspace 下的所有 WorkTree
   */
  async getByWorkspace(workspaceId: string): Promise<WorkTree[]> {
    return this.worktreeRepo.findByWorkspace(workspaceId);
  }

  /**
   * 获取 WorkTree 的文件变更
   */
  async getChanges(worktreeId: string): Promise<FileChange[]> {
    const worktree = await this.worktreeRepo.findById(worktreeId);
    if (!worktree) {
      throw new Error("WorkTree not found");
    }

    try {
      // 获取相对于基础分支的变更
      const { stdout } = await execAsync(
        `git diff --stat "${worktree.baseBranch}"...HEAD`,
        { cwd: worktree.localPath },
      );

      return this.parseGitDiffStat(stdout);
    } catch (error) {
      console.error("Failed to get changes:", error);
      return [];
    }
  }

  /**
   * 获取变更统计
   */
  async getChangesStats(worktreeId: string): Promise<ChangesStats> {
    const changes = await this.getChanges(worktreeId);

    const stats: ChangesStats = {
      added: 0,
      modified: 0,
      deleted: 0,
    };

    for (const change of changes) {
      if (change.status === "added") stats.added++;
      else if (change.status === "modified") stats.modified++;
      else if (change.status === "deleted") stats.deleted++;
    }

    // 更新数据库中的统计
    await this.worktreeRepo.update(worktreeId, {
      changesStats: JSON.stringify(stats),
    });

    return stats;
  }

  /**
   * 获取特定文件的 diff
   */
  async getFileDiff(worktreeId: string, filePath: string): Promise<string> {
    const worktree = await this.worktreeRepo.findById(worktreeId);
    if (!worktree) {
      throw new Error("WorkTree not found");
    }

    try {
      const { stdout } = await execAsync(
        `git diff "${worktree.baseBranch}"...HEAD -- "${filePath}"`,
        { cwd: worktree.localPath },
      );
      return stdout;
    } catch (error) {
      console.error("Failed to get file diff:", error);
      return "";
    }
  }

  /**
   * 更新 WorkTree 状态
   */
  async updateStatus(
    worktreeId: string,
    status: WorkTreeStatus,
  ): Promise<WorkTree | null> {
    return this.worktreeRepo.updateStatus(worktreeId, status);
  }

  /**
   * 合并 WorkTree 到主分支
   */
  async merge(worktreeId: string): Promise<void> {
    const worktree = await this.worktreeRepo.findById(worktreeId);
    if (!worktree) {
      throw new Error("WorkTree not found");
    }

    const workspace = await this.workspaceRepo.findById(worktree.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const bareRepoPath = this.getBareRepoPath(workspace.repoFullName);
    const mainWorktreePath = path.join(
      this.getRepoRootPath(workspace.repoFullName),
      "main",
    );

    try {
      // 在 main worktree 中执行合并
      await execAsync(`git checkout "${workspace.branch}"`, {
        cwd: mainWorktreePath,
      });

      await execAsync(
        `git merge "${worktree.branchName}" -m "Merge task: ${worktree.name}"`,
        { cwd: mainWorktreePath },
      );

      // 更新状态
      await this.worktreeRepo.updateStatus(worktreeId, "merged");
    } catch (error) {
      throw new Error(`Failed to merge worktree: ${error}`);
    }
  }

  /**
   * 废弃 WorkTree
   */
  async abandon(worktreeId: string): Promise<void> {
    const worktree = await this.worktreeRepo.findById(worktreeId);
    if (!worktree) {
      throw new Error("WorkTree not found");
    }

    const workspace = await this.workspaceRepo.findById(worktree.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const bareRepoPath = this.getBareRepoPath(workspace.repoFullName);

    try {
      // 删除 worktree（在 bare repo 中执行）
      await execAsync(`git worktree remove "${worktree.localPath}" --force`, {
        cwd: bareRepoPath,
      });

      // 删除分支
      await execAsync(`git branch -D "${worktree.branchName}"`, {
        cwd: bareRepoPath,
      });

      // 更新状态
      await this.worktreeRepo.updateStatus(worktreeId, "abandoned");
    } catch (error) {
      // 即使删除失败，也更新状态
      await this.worktreeRepo.updateStatus(worktreeId, "abandoned");
      console.error("Failed to clean up worktree:", error);
    }
  }

  /**
   * 提交并推送变更（不创建 PR）
   */
  async commitAndPush(
    worktreeId: string,
    message: string,
  ): Promise<{ success: boolean; branch: string }> {
    const worktree = await this.worktreeRepo.findById(worktreeId);
    if (!worktree) {
      throw new Error("WorkTree not found");
    }

    try {
      // 提交所有变更
      await execAsync(`git add -A`, { cwd: worktree.localPath });
      await execAsync(`git commit -m "${message}" --allow-empty`, {
        cwd: worktree.localPath,
      });

      // 推送分支
      await execAsync(`git push -u origin "${worktree.branchName}"`, {
        cwd: worktree.localPath,
      });

      return { success: true, branch: worktree.branchName };
    } catch (error) {
      throw new Error(`Failed to commit and push: ${error}`);
    }
  }

  /**
   * 创建 Pull Request
   */
  async createPullRequest(
    worktreeId: string,
    title: string,
    body?: string,
  ): Promise<{ url: string; number: number }> {
    const worktree = await this.worktreeRepo.findById(worktreeId);
    if (!worktree) {
      throw new Error("WorkTree not found");
    }

    try {
      // 先提交所有变更
      await execAsync(`git add -A`, { cwd: worktree.localPath });
      await execAsync(
        `git commit -m "${title}" --allow-empty`,
        { cwd: worktree.localPath },
      );

      // 推送分支
      await execAsync(`git push -u origin "${worktree.branchName}"`, {
        cwd: worktree.localPath,
      });

      // 使用 gh cli 创建 PR
      const escapedBody = (body || "").replace(/"/g, '\\"');
      const { stdout } = await execAsync(
        `gh pr create --title "${title}" --body "${escapedBody}" --base "${worktree.baseBranch}"`,
        { cwd: worktree.localPath },
      );

      const prUrl = stdout.trim();
      const prNumber = parseInt(prUrl.split("/").pop() || "0");

      // 更新状态为 pending（等待 PR 审核）
      await this.worktreeRepo.updateStatus(worktreeId, "pending");

      return { url: prUrl, number: prNumber };
    } catch (error) {
      throw new Error(`Failed to create pull request: ${error}`);
    }
  }

  /**
   * 清理已归档的 WorkTree
   */
  async cleanup(worktreeId: string): Promise<void> {
    const worktree = await this.worktreeRepo.findById(worktreeId);
    if (!worktree) return;

    if (worktree.status !== "merged" && worktree.status !== "abandoned") {
      throw new Error("Can only cleanup merged or abandoned worktrees");
    }

    const workspace = await this.workspaceRepo.findById(worktree.workspaceId);
    if (!workspace) return;

    const bareRepoPath = this.getBareRepoPath(workspace.repoFullName);

    try {
      // 尝试删除 worktree（如果还存在）
      await execAsync(`git worktree remove "${worktree.localPath}" --force`, {
        cwd: bareRepoPath,
      }).catch(() => {});

      // 尝试删除分支（如果还存在）
      await execAsync(`git branch -D "${worktree.branchName}"`, {
        cwd: bareRepoPath,
      }).catch(() => {});

      // 更新状态
      await this.worktreeRepo.updateStatus(worktreeId, "archived");
    } catch (error) {
      console.error("Failed to cleanup worktree:", error);
    }
  }

  /**
   * 创建新的 Worktree（简化版本，用于创建新任务）
   */
  async create(options: {
    workspaceId: string;
    name: string;
    baseBranch?: string;
  }): Promise<WorkTree> {
    const { workspaceId, name, baseBranch } = options;

    const workspace = await this.workspaceRepo.findById(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const branch = baseBranch || workspace.branch || "main";
    const sanitizedName = this.sanitizeName(name);
    const branchName = `task/${sanitizedName}`;

    // 新结构：worktree 在仓库根目录下，与 main 平级
    const repoRootPath = this.getRepoRootPath(workspace.repoFullName);
    const bareRepoPath = this.getBareRepoPath(workspace.repoFullName);
    const worktreePath = path.join(repoRootPath, sanitizedName);

    // 检查是否已存在同名 worktree
    const existing = await this.worktreeRepo.findByWorkspace(workspaceId);
    if (existing.some((w) => w.name === name)) {
      throw new Error(`Worktree "${name}" already exists`);
    }

    // 创建 git worktree（在 bare repo 中执行）
    try {
      // 先 fetch 最新代码
      await execAsync(`git fetch origin`, { cwd: bareRepoPath }).catch(
        () => {},
      );

      await execAsync(
        `git worktree add -b "${branchName}" "${worktreePath}" "${branch}"`,
        { cwd: bareRepoPath },
      );
    } catch (error) {
      throw new Error(`Failed to create git worktree: ${error}`);
    }

    // 保存到数据库
    const worktree = await this.worktreeRepo.create({
      workspaceId,
      name,
      branchName,
      localPath: worktreePath,
      baseBranch: branch,
      status: "active",
    });

    return worktree;
  }

  /**
   * 删除 Worktree
   */
  async delete(worktreeId: string): Promise<void> {
    const worktree = await this.worktreeRepo.findById(worktreeId);
    if (!worktree) {
      throw new Error("WorkTree not found");
    }

    const workspace = await this.workspaceRepo.findById(worktree.workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const bareRepoPath = this.getBareRepoPath(workspace.repoFullName);

    try {
      // 删除 worktree（在 bare repo 中执行）
      await execAsync(`git worktree remove "${worktree.localPath}" --force`, {
        cwd: bareRepoPath,
      }).catch(() => {});

      // 删除分支
      await execAsync(`git branch -D "${worktree.branchName}"`, {
        cwd: bareRepoPath,
      }).catch(() => {});
    } catch (error) {
      console.error("Failed to delete worktree:", error);
    }

    // 从数据库删除
    await this.worktreeRepo.delete(worktreeId);
  }

  /**
   * 获取 Worktree 路径预览（用于前端显示）
   */
  async getWorktreePathPreview(
    workspaceId: string,
    name: string
  ): Promise<string> {
    const workspace = await this.workspaceRepo.findById(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const sanitizedName = this.sanitizeName(name);
    const repoRootPath = this.getRepoRootPath(workspace.repoFullName);
    return path.join(repoRootPath, sanitizedName || "task-name");
  }

  /**
   * 获取仓库可用的分支列表
   */
  async getBranches(workspaceId: string): Promise<string[]> {
    const workspace = await this.workspaceRepo.findById(workspaceId);
    if (!workspace) {
      throw new Error("Workspace not found");
    }

    const bareRepoPath = this.getBareRepoPath(workspace.repoFullName);

    // Check if bare repo exists
    const fs = await import("fs/promises");
    try {
      await fs.access(bareRepoPath);
    } catch {
      // Bare repo doesn't exist, try using localPath directly
      console.warn(
        `Bare repo not found at ${bareRepoPath}, trying localPath: ${workspace.localPath}`
      );

      // Try to get branches from the workspace localPath
      try {
        const { stdout } = await execAsync(`git branch -r`, {
          cwd: workspace.localPath,
        });
        return stdout
          .split("\n")
          .map((b) => b.trim())
          .filter((b) => b && !b.includes("HEAD"))
          .map((b) => b.replace("origin/", ""));
      } catch {
        return ["main"];
      }
    }

    try {
      // 先 fetch（在 bare repo 中执行）
      await execAsync(`git fetch origin`, { cwd: bareRepoPath }).catch(
        () => {},
      );

      const { stdout } = await execAsync(`git branch -r`, {
        cwd: bareRepoPath,
      });

      return stdout
        .split("\n")
        .map((b) => b.trim())
        .filter((b) => b && !b.includes("HEAD"))
        .map((b) => b.replace("origin/", ""));
    } catch (error) {
      console.error("Failed to get branches:", error);
      return ["main"];
    }
  }

  /**
   * 规范化名称用于分支
   */
  private sanitizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50);
  }

  /**
   * 解析 git diff --stat 输出
   */
  private parseGitDiffStat(diffStat: string): FileChange[] {
    const lines = diffStat.split("\n").filter((l) => l.includes("|"));
    return lines
      .map((line) => {
        // 匹配格式: " path/to/file | 123 ++--" 或 " path/to/file | Bin 0 -> 123 bytes"
        const match = line.match(/^\s*(.+?)\s*\|\s*(\d+|Bin)/);
        if (!match) return null;

        const path = match[1].trim();
        const isBinary = match[2] === "Bin";

        if (isBinary) {
          return {
            path,
            status: "modified" as const,
            additions: 0,
            deletions: 0,
          };
        }

        // 获取 + 和 - 的数量
        const indicators = line.split("|")[1] || "";
        const additions = (indicators.match(/\+/g) || []).length;
        const deletions = (indicators.match(/-/g) || []).length;

        // 判断文件状态
        let status: "added" | "modified" | "deleted" = "modified";
        if (deletions === 0 && additions > 0) {
          status = "added";
        } else if (additions === 0 && deletions > 0) {
          status = "deleted";
        }

        return {
          path,
          status,
          additions,
          deletions,
        };
      })
      .filter(Boolean) as FileChange[];
  }
}
