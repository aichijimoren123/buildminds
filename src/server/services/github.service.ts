import { Octokit } from "@octokit/rest";
import { simpleGit, type SimpleGit, type StatusResult } from "simple-git";
import path from "path";
import * as fs from "fs/promises";

export interface GitHubRepoInfo {
  name: string;
  fullName: string;
  cloneUrl: string;
  isPrivate: boolean;
  defaultBranch: string;
  description?: string;
  language?: string;
  updatedAt?: string;
}

export interface RepoStatus {
  isClean: boolean;
  modified: string[];
  created: string[];
  deleted: string[];
}

export class GitHubService {
  // Get base repo path dynamically from settings/env
  private getBaseRepoPath(): string {
    return (
      process.env.GITHUB_REPOS_PATH ||
      path.join(process.cwd(), "..", "claude-projects")
    );
  }

  /**
   * 获取仓库根目录路径
   * 结构: baseRepoPath/owner-repo/
   */
  getRepoRootPath(repoFullName: string): string {
    return path.join(this.getBaseRepoPath(), repoFullName.replace("/", "-"));
  }

  /**
   * 获取 bare repository 路径
   * 结构: baseRepoPath/owner-repo/.bare
   */
  getBareRepoPath(repoFullName: string): string {
    return path.join(this.getRepoRootPath(repoFullName), ".bare");
  }

  /**
   * 获取 main worktree 路径
   * 结构: baseRepoPath/owner-repo/main
   */
  getMainWorktreePath(repoFullName: string): string {
    return path.join(this.getRepoRootPath(repoFullName), "main");
  }

  async ensureRepoDirectory(): Promise<void> {
    await fs.mkdir(this.getBaseRepoPath(), { recursive: true });
  }

  async listUserRepos(accessToken: string): Promise<GitHubRepoInfo[]> {
    const octokit = new Octokit({ auth: accessToken });
    try {
      const { data } = await octokit.repos.listForAuthenticatedUser({
        per_page: 100,
        sort: "updated",
        affiliation: "owner,collaborator,organization_member",
      });
      return data.map((repo) => ({
        name: repo.name,
        fullName: repo.full_name,
        cloneUrl: repo.clone_url,
        isPrivate: repo.private,
        defaultBranch: repo.default_branch || "main",
        description: repo.description || undefined,
        language: repo.language || undefined,
        updatedAt: repo.updated_at || undefined,
      }));
    } catch (error) {
      console.error("Failed to list GitHub repos:", error);
      throw new Error("Failed to list GitHub repositories");
    }
  }

  async cloneRepo(
    cloneUrl: string,
    repoFullName: string,
    accessToken: string,
    defaultBranch: string = "main",
  ): Promise<string> {
    await this.ensureRepoDirectory();

    const repoRootPath = this.getRepoRootPath(repoFullName);
    const bareRepoPath = this.getBareRepoPath(repoFullName);
    const mainWorktreePath = this.getMainWorktreePath(repoFullName);

    // 清理已存在的目录
    try {
      await fs.rm(repoRootPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore if directory doesn't exist
    }

    try {
      const authenticatedUrl = cloneUrl.replace(
        "https://",
        `https://x-access-token:${accessToken}@`,
      );

      // 创建仓库根目录
      await fs.mkdir(repoRootPath, { recursive: true });

      // 1. 克隆为 bare repository
      const git: SimpleGit = simpleGit();
      await git.clone(authenticatedUrl, bareRepoPath, ["--bare"]);

      // 2. 配置 bare repo 以支持 worktree
      const bareGit = simpleGit(bareRepoPath);

      // 设置 fetch refspec 以便能拉取所有分支
      await bareGit.raw([
        "config",
        "remote.origin.fetch",
        "+refs/heads/*:refs/remotes/origin/*",
      ]);

      // 3. 创建 main worktree
      await bareGit.raw([
        "worktree",
        "add",
        mainWorktreePath,
        defaultBranch,
      ]);

      // 返回 main worktree 路径（这是实际的工作目录）
      return mainWorktreePath;
    } catch (error) {
      console.error("Failed to clone repo:", error);
      throw new Error(`Failed to clone repository: ${repoFullName}`);
    }
  }

  async pullRepo(localPath: string, accessToken: string): Promise<void> {
    try {
      const git: SimpleGit = simpleGit(localPath);

      const remoteUrl = (await git.getRemotes(true))[0]?.refs?.fetch;
      if (remoteUrl) {
        const authenticatedUrl = remoteUrl.replace(
          "https://",
          `https://x-access-token:${accessToken}@`,
        );
        await git.remote(["set-url", "origin", authenticatedUrl]);
      }

      await git.pull();
    } catch (error) {
      console.error("Failed to pull repo:", error);
      throw new Error("Failed to pull latest changes");
    }
  }

  async commitAndPush(
    localPath: string,
    message: string,
    accessToken: string,
  ): Promise<void> {
    try {
      const git: SimpleGit = simpleGit(localPath);

      await git.add(".");

      const status = await git.status();
      if (status.files.length === 0) {
        console.log("No changes to commit");
        return;
      }

      await git.commit(message);

      const remoteUrl = (await git.getRemotes(true))[0]?.refs?.fetch;
      if (remoteUrl) {
        const authenticatedUrl = remoteUrl.replace(
          "https://",
          `https://x-access-token:${accessToken}@`,
        );
        await git.remote(["set-url", "origin", authenticatedUrl]);
      }

      await git.push();
    } catch (error) {
      console.error("Failed to commit and push:", error);
      throw new Error("Failed to commit and push changes");
    }
  }

  async getStatus(localPath: string): Promise<RepoStatus> {
    try {
      const git: SimpleGit = simpleGit(localPath);
      const status: StatusResult = await git.status();

      return {
        isClean: status.isClean(),
        modified: status.modified,
        created: status.created,
        deleted: status.deleted,
      };
    } catch (error) {
      console.error("Failed to get repo status:", error);
      throw new Error("Failed to get repository status");
    }
  }

  async checkRepoExists(localPath: string): Promise<boolean> {
    try {
      // 检查是否是 worktree（有 .git 文件指向 bare repo）
      const gitPath = path.join(localPath, ".git");
      const stat = await fs.stat(gitPath);
      // worktree 的 .git 是一个文件，普通 repo 的 .git 是目录
      return stat.isFile() || stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * 检查 bare repository 是否存在
   */
  async checkBareRepoExists(repoFullName: string): Promise<boolean> {
    try {
      const bareRepoPath = this.getBareRepoPath(repoFullName);
      await fs.access(path.join(bareRepoPath, "HEAD"));
      return true;
    } catch {
      return false;
    }
  }
}
