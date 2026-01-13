import { exec } from "child_process";
import { promisify } from "util";
import { nanoid } from "nanoid";
import type {
  WorkTree,
  InsertWorkTree,
  WorkTreeStatus,
  ChangesStats,
  GithubRepo,
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
    const worktreePath = `${workspace.localPath}/.worktrees/${sessionId}`;

    // 创建 git worktree
    try {
      await execAsync(
        `git worktree add -b "${branchName}" "${worktreePath}" "${branch}"`,
        { cwd: workspace.localPath },
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

    try {
      // 确保主分支是最新的
      await execAsync(`git checkout "${workspace.branch}"`, {
        cwd: workspace.localPath,
      });

      // 在主仓库中合并
      await execAsync(
        `git merge "${worktree.branchName}" -m "Merge task: ${worktree.name}"`,
        { cwd: workspace.localPath },
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

    try {
      // 删除 worktree
      await execAsync(`git worktree remove "${worktree.localPath}" --force`, {
        cwd: workspace.localPath,
      });

      // 删除分支
      await execAsync(`git branch -D "${worktree.branchName}"`, {
        cwd: workspace.localPath,
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

    try {
      // 尝试删除 worktree（如果还存在）
      await execAsync(`git worktree remove "${worktree.localPath}" --force`, {
        cwd: workspace.localPath,
      }).catch(() => {});

      // 尝试删除分支（如果还存在）
      await execAsync(`git branch -D "${worktree.branchName}"`, {
        cwd: workspace.localPath,
      }).catch(() => {});

      // 更新状态
      await this.worktreeRepo.updateStatus(worktreeId, "archived");
    } catch (error) {
      console.error("Failed to cleanup worktree:", error);
    }
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
