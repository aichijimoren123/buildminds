import { desc, eq } from "drizzle-orm";
import {
  githubRepos,
  type GithubRepo,
  type InsertGithubRepo,
} from "../database/schema";
import { BaseRepository } from "./base.repository";

export class GithubRepoRepository extends BaseRepository {
  async create(data: InsertGithubRepo): Promise<GithubRepo> {
    try {
      const [repo] = await this.db.insert(githubRepos).values(data).returning();
      return repo;
    } catch (error) {
      this.handleError(error, "create github repo");
    }
  }

  async findById(id: string): Promise<GithubRepo | null> {
    try {
      const [repo] = await this.db
        .select()
        .from(githubRepos)
        .where(eq(githubRepos.id, id))
        .limit(1);
      return repo || null;
    } catch (error) {
      this.handleError(error, "find github repo by id");
    }
  }

  async findByUserId(userId: string): Promise<GithubRepo[]> {
    try {
      return await this.db
        .select()
        .from(githubRepos)
        .where(eq(githubRepos.userId, userId))
        .orderBy(desc(githubRepos.updatedAt));
    } catch (error) {
      this.handleError(error, "find github repos by user id");
    }
  }

  async findByUserIdAndRepoName(
    userId: string,
    repoFullName: string,
  ): Promise<GithubRepo | null> {
    try {
      const [repo] = await this.db
        .select()
        .from(githubRepos)
        .where(eq(githubRepos.userId, userId))
        .where(eq(githubRepos.repoFullName, repoFullName))
        .limit(1);
      return repo || null;
    } catch (error) {
      this.handleError(error, "find github repo by user and name");
    }
  }

  async update(
    id: string,
    data: Partial<InsertGithubRepo>,
  ): Promise<GithubRepo | null> {
    try {
      const [updated] = await this.db
        .update(githubRepos)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(githubRepos.id, id))
        .returning();
      return updated || null;
    } catch (error) {
      this.handleError(error, "update github repo");
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(githubRepos)
        .where(eq(githubRepos.id, id));
      return result.rowsAffected > 0;
    } catch (error) {
      this.handleError(error, "delete github repo");
    }
  }
}
