import { eq } from "drizzle-orm";
import { settings, type Setting } from "../database/schema";
import { BaseRepository } from "./base.repository";

export class SettingsRepository extends BaseRepository {
  async get(key: string): Promise<string | null> {
    try {
      const [setting] = await this.db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);
      return setting?.value || null;
    } catch (error) {
      this.handleError(error, "get setting");
    }
  }

  async getAll(): Promise<Record<string, string>> {
    try {
      const allSettings = await this.db.select().from(settings);
      return allSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);
    } catch (error) {
      this.handleError(error, "get all settings");
    }
  }

  async set(key: string, value: string): Promise<Setting> {
    try {
      const [setting] = await this.db
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value, updatedAt: new Date() },
        })
        .returning();
      return setting;
    } catch (error) {
      this.handleError(error, "set setting");
    }
  }

  async setMany(data: Record<string, string>): Promise<void> {
    try {
      // Use transaction for batch updates
      await this.db.transaction(async (tx) => {
        for (const [key, value] of Object.entries(data)) {
          await tx
            .insert(settings)
            .values({ key, value })
            .onConflictDoUpdate({
              target: settings.key,
              set: { value, updatedAt: new Date() },
            });
        }
      });
    } catch (error) {
      this.handleError(error, "set many settings");
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(settings)
        .where(eq(settings.key, key));
      return (result as any).changes > 0;
    } catch (error) {
      this.handleError(error, "delete setting");
    }
  }
}
