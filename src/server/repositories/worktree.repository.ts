import { desc, eq, and } from "drizzle-orm";
import {
  worktrees,
  type InsertWorkTree,
  type WorkTree,
  type WorkTreeStatus,
} from "../database/schema";
import { BaseRepository } from "./base.repository";

export class WorkTreeRepository extends BaseRepository {
  async create(data: InsertWorkTree): Promise<WorkTree> {
    try {
      const [worktree] = await this.db
        .insert(worktrees)
        .values(data)
        .returning();
      return worktree;
    } catch (error) {
      this.handleError(error, "create worktree");
    }
  }

  async findById(id: string): Promise<WorkTree | null> {
    try {
      const [worktree] = await this.db
        .select()
        .from(worktrees)
        .where(eq(worktrees.id, id))
        .limit(1);
      return worktree || null;
    } catch (error) {
      this.handleError(error, "find worktree by id");
    }
  }

  async findByWorkspace(workspaceId: string): Promise<WorkTree[]> {
    try {
      return await this.db
        .select()
        .from(worktrees)
        .where(eq(worktrees.workspaceId, workspaceId))
        .orderBy(desc(worktrees.updatedAt));
    } catch (error) {
      this.handleError(error, "find worktrees by workspace");
    }
  }

  async findByWorkspaceAndStatus(
    workspaceId: string,
    status: WorkTreeStatus,
  ): Promise<WorkTree[]> {
    try {
      return await this.db
        .select()
        .from(worktrees)
        .where(
          and(
            eq(worktrees.workspaceId, workspaceId),
            eq(worktrees.status, status),
          ),
        )
        .orderBy(desc(worktrees.updatedAt));
    } catch (error) {
      this.handleError(error, "find worktrees by workspace and status");
    }
  }

  async findByStatus(status: WorkTreeStatus): Promise<WorkTree[]> {
    try {
      return await this.db
        .select()
        .from(worktrees)
        .where(eq(worktrees.status, status))
        .orderBy(desc(worktrees.updatedAt));
    } catch (error) {
      this.handleError(error, "find worktrees by status");
    }
  }

  async update(
    id: string,
    data: Partial<InsertWorkTree>,
  ): Promise<WorkTree | null> {
    try {
      const [updated] = await this.db
        .update(worktrees)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(worktrees.id, id))
        .returning();
      return updated || null;
    } catch (error) {
      this.handleError(error, "update worktree");
    }
  }

  async updateStatus(
    id: string,
    status: WorkTreeStatus,
  ): Promise<WorkTree | null> {
    return this.update(id, { status });
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(worktrees)
        .where(eq(worktrees.id, id));
      return (result as any).changes > 0;
    } catch (error) {
      this.handleError(error, "delete worktree");
    }
  }

  async findAll(): Promise<WorkTree[]> {
    try {
      return await this.db
        .select()
        .from(worktrees)
        .orderBy(desc(worktrees.updatedAt));
    } catch (error) {
      this.handleError(error, "find all worktrees");
    }
  }
}
