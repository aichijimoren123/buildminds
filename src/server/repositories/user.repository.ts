import type { DatabaseType } from "../database";
import { sqlite } from "../database";

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  accessToken: string;
}

export class UserRepository {
  constructor(private db: DatabaseType) {}

  async findById(userId: string): Promise<User | null> {
    try {
      // Query both user and account tables from better-auth
      // Use the raw SQLite connection since Drizzle doesn't support raw SQL easily
      const result = sqlite
        .query(
          `
        SELECT
          u.id,
          u.name,
          u.email,
          u.image,
          a.access_token as accessToken
        FROM user u
        LEFT JOIN account a ON u.id = a.user_id
        WHERE u.id = ? AND a.provider_id = 'github'
        LIMIT 1
      `,
        )
        .get(userId) as any;

      if (!result) {
        return null;
      }

      return {
        id: result.id,
        name: result.name,
        email: result.email,
        image: result.image || undefined,
        accessToken: result.accessToken || "",
      };
    } catch (error) {
      console.error("Failed to find user by id:", error);
      return null;
    }
  }
}
