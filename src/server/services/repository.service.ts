import * as fs from "fs/promises";
import type { GithubRepo } from "../database/schema";
import { GithubRepoRepository } from "../repositories/github-repo.repository";
import { UserRepository } from "../repositories/user.repository";
import { GitHubService, type GitHubRepoInfo } from "./github.service";

export class RepositoryService {
  constructor(
    private githubRepoRepo: GithubRepoRepository,
    private userRepo: UserRepository,
    private githubService: GitHubService
  ) {}

  async addRepository(userId: string, repoFullName: string): Promise<GithubRepo> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error("User not found");

    // Check if already exists
    const existing = await this.githubRepoRepo.findByUserIdAndRepoName(userId, repoFullName);
    if (existing) {
      return existing;
    }

    // Get repo info from GitHub
    const repos = await this.githubService.listUserRepos(user.accessToken);
    const repo = repos.find(r => r.fullName === repoFullName);
    if (!repo) throw new Error("Repository not found on GitHub");

    // Clone repo
    const localPath = await this.githubService.cloneRepo(
      repo.cloneUrl,
      repo.fullName,
      user.accessToken
    );

    // Save to database
    return await this.githubRepoRepo.create({
      userId,
      repoFullName: repo.fullName,
      repoUrl: `https://api.github.com/repos/${repo.fullName}`,
      cloneUrl: repo.cloneUrl,
      localPath,
      isPrivate: repo.isPrivate,
      lastSynced: new Date(),
    });
  }

  async syncRepository(repoId: string): Promise<void> {
    const repo = await this.githubRepoRepo.findById(repoId);
    if (!repo) throw new Error("Repository not found");

    const user = await this.userRepo.findById(repo.userId);
    if (!user) throw new Error("User not found");

    const repoExists = await this.githubService.checkRepoExists(repo.localPath);

    if (!repoExists) {
      console.log(`Repository not found locally, cloning: ${repo.repoFullName}`);
      await this.githubService.cloneRepo(repo.cloneUrl, repo.repoFullName, user.accessToken);
    } else {
      await this.githubService.pullRepo(repo.localPath, user.accessToken);
    }

    await this.githubRepoRepo.update(repoId, { lastSynced: new Date() });
  }

  async listRepositories(userId: string): Promise<GithubRepo[]> {
    return await this.githubRepoRepo.findByUserId(userId);
  }

  async listAvailableRepos(userId: string): Promise<GitHubRepoInfo[]> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new Error("User not found");

    return await this.githubService.listUserRepos(user.accessToken);
  }

  async removeRepository(repoId: string): Promise<void> {
    const repo = await this.githubRepoRepo.findById(repoId);
    if (!repo) throw new Error("Repository not found");

    try {
      await fs.rm(repo.localPath, { recursive: true, force: true });
    } catch (error) {
      console.error("Failed to remove local repo directory:", error);
    }

    await this.githubRepoRepo.delete(repoId);
  }

  async getRepository(repoId: string): Promise<GithubRepo | null> {
    return await this.githubRepoRepo.findById(repoId);
  }

  async getRepoStatus(repoId: string) {
    const repo = await this.githubRepoRepo.findById(repoId);
    if (!repo) throw new Error("Repository not found");

    return await this.githubService.getStatus(repo.localPath);
  }

  async commitAndPush(repoId: string, message: string): Promise<void> {
    const repo = await this.githubRepoRepo.findById(repoId);
    if (!repo) throw new Error("Repository not found");

    const user = await this.userRepo.findById(repo.userId);
    if (!user) throw new Error("User not found");

    await this.githubService.commitAndPush(repo.localPath, message, user.accessToken);
    await this.githubRepoRepo.update(repoId, { lastSynced: new Date() });
  }
}
