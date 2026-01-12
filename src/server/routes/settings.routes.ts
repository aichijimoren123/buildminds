import type { Hono } from "hono";
import { SettingsController } from "../controllers/settings.controller";

export function registerSettingsRoutes(
  app: Hono,
  controller: SettingsController,
) {
  app.get("/api/settings", (c) => controller.get(c));
  app.put("/api/settings", (c) => controller.update(c));
}
