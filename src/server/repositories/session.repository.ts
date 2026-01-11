import { eq, desc, isNotNull, sql } from "drizzle-orm";
import { BaseRepository } from "./base.repository";
import { sessions, type Session, type InsertSession } from "../db/schema";

export class SessionRepository extends BaseRepository {
  async create(data: InsertSession): Promise<Session> {
    try {
      const [session] = await this.db
        .insert(sessions)
        .values(data)
        .returning();
      return session;
    } catch (error) {
      this.handleError(error, "create session");
    }
  }

  async findById(id: string): Promise<Session | null> {
    try {
      const [session] = await this.db
        .select()
        .from(sessions)
        .where(eq(sessions.id, id))
        .limit(1);
      return session || null;
    } catch (error) {
      this.handleError(error, "find session by id");
    }
  }

  async findAll(): Promise<Session[]> {
    try {
      return await this.db
        .select()
        .from(sessions)
        .orderBy(desc(sessions.updatedAt));
    } catch (error) {
      this.handleError(error, "find all sessions");
    }
  }

  async findByStatus(status: string): Promise<Session[]> {
    try {
      return await this.db
        .select()
        .from(sessions)
        .where(eq(sessions.status, status))
        .orderBy(desc(sessions.updatedAt));
    } catch (error) {
      this.handleError(error, "find sessions by status");
    }
  }

  async update(id: string, data: Partial<InsertSession>): Promise<Session | null> {
    try {
      const [updated] = await this.db
        .update(sessions)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(sessions.id, id))
        .returning();
      return updated || null;
    } catch (error) {
      this.handleError(error, "update session");
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(sessions)
        .where(eq(sessions.id, id));
      // Drizzle returns changes count in rowsAffected or count
      return (result as any).changes > 0;
    } catch (error) {
      this.handleError(error, "delete session");
    }
  }

  async getRecentCwds(limit = 8): Promise<string[]> {
    try {
      const result = await this.db
        .selectDistinct({ cwd: sessions.cwd })
        .from(sessions)
        .where(isNotNull(sessions.cwd))
        .orderBy(desc(sessions.updatedAt))
        .limit(limit);

      return result.map((r) => r.cwd).filter(Boolean) as string[];
    } catch (error) {
      this.handleError(error, "get recent cwds");
    }
  }
}
