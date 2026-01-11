import type { Context } from "hono";
import { SettingsService } from "../services/settings.service";

export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  async get(c: Context) {
    try {
      const settings = await this.settingsService.getAll();
      return c.json({ settings });
    } catch (error) {
      return c.json({ error: String(error) }, 500);
    }
  }

  async update(c: Context) {
    try {
      const body = await c.req.json() as { settings: Record<string, string> };
      if (!body.settings || typeof body.settings !== "object") {
        return c.json({ error: "Invalid request body" }, 400);
      }
      await this.settingsService.setMany(body.settings);
      return c.json({ success: true });
    } catch (error) {
      return c.json({ error: String(error) }, 500);
    }
  }
}
