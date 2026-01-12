import { Octokit } from "@octokit/rest";
import { simpleGit, type SimpleGit, type StatusResult } from "simple-git";
import path from "path";
import * as fs from "fs/promises";

export interface GitHubRepoInfo {
  name: string;
  fullName: string;
  cloneUrl: string;
  isPrivate: boolean;
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
  private baseRepoPath: string;

  constructor() {
    this.baseRepoPath =
      process.env.GITHUB_REPOS_PATH ||
      path.join(process.cwd(), ".claude-repos");
  }

  async ensureRepoDirectory(): Promise<void> {
    await fs.mkdir(this.baseRepoPath, { recursive: true });
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
        description: repo.description || undefined,
        language: repo.language || undefined,
        updatedAt: repo.updated_at,
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
  ): Promise<string> {
    await this.ensureRepoDirectory();

    const localPath = path.join(
      this.baseRepoPath,
      repoFullName.replace("/", "-"),
    );

    try {
      await fs.rm(localPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore if directory doesn't exist
    }

    try {
      const authenticatedUrl = cloneUrl.replace(
        "https://",
        `https://x-access-token:${accessToken}@`,
      );
      const git: SimpleGit = simpleGit();
      await git.clone(authenticatedUrl, localPath, ["--depth", "1"]);

      return localPath;
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
      await fs.access(path.join(localPath, ".git"));
      return true;
    } catch {
      return false;
    }
  }
}
