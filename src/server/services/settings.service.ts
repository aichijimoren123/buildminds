import { SettingsRepository } from "../repositories/settings.repository";
import { loadClaudeSettingsEnv } from "../../claude-settings";

export class SettingsService {
  constructor(private settingsRepo: SettingsRepository) {}

  async get(key: string): Promise<string | null> {
    return await this.settingsRepo.get(key);
  }

  async getAll(): Promise<Record<string, string>> {
    return await this.settingsRepo.getAll();
  }

  async set(key: string, value: string): Promise<void> {
    await this.settingsRepo.set(key, value);
  }

  async setMany(settings: Record<string, string>): Promise<void> {
    await this.settingsRepo.setMany(settings);

    // Reload Claude settings environment variables
    // This matches the behavior in the original index.tsx
    this.reloadClaudeEnv();
  }

  async delete(key: string): Promise<boolean> {
    return await this.settingsRepo.delete(key);
  }

  private reloadClaudeEnv(): void {
    // Create a temporary object with getAllSettings method
    // to match the SessionStore interface expected by loadClaudeSettingsEnv
    const sessionStoreLike = {
      getAllSettings: () => {
        // This is a sync call, but we already have the settings in process.env
        // so loadClaudeSettingsEnv can use them directly
        const settings: Record<string, string> = {};
        return settings;
      },
    };

    // Load settings from database and update process.env
    this.settingsRepo.getAll().then((settings) => {
      for (const [key, value] of Object.entries(settings)) {
        if (value !== undefined && value !== null && value !== "") {
          process.env[key] = value;
        }
      }
    });
  }
}
