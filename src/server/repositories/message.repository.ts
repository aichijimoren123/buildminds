import { asc, eq } from "drizzle-orm";
import { messages, type InsertMessage, type Message } from "../database/schema";
import { BaseRepository } from "./base.repository";

export class MessageRepository extends BaseRepository {
  async create(data: InsertMessage): Promise<Message> {
    try {
      const [message] = await this.db
        .insert(messages)
        .values(data)
        .returning();
      return message;
    } catch (error) {
      this.handleError(error, "create message");
    }
  }

  async findBySessionId(sessionId: string): Promise<Message[]> {
    try {
      return await this.db
        .select()
        .from(messages)
        .where(eq(messages.sessionId, sessionId))
        .orderBy(asc(messages.createdAt));
    } catch (error) {
      this.handleError(error, "find messages by session");
    }
  }

  async deleteBySessionId(sessionId: string): Promise<number> {
    try {
      const result = await this.db
        .delete(messages)
        .where(eq(messages.sessionId, sessionId));
      // Return the number of deleted rows
      return (result as any).changes || 0;
    } catch (error) {
      this.handleError(error, "delete messages by session");
    }
  }

  async batchCreate(data: InsertMessage[]): Promise<Message[]> {
    try {
      return await this.db
        .insert(messages)
        .values(data)
        .returning();
    } catch (error) {
      this.handleError(error, "batch create messages");
    }
  }
}
