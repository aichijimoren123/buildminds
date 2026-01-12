import type { Hono } from "hono";
import { SessionController } from "../controllers/session.controller";

export function registerSessionRoutes(
  app: Hono,
  controller: SessionController,
) {
  app.get("/api/sessions/recent-cwd", (c) => controller.getRecentCwds(c));
  app.get("/api/sessions/default-cwd", (c) => controller.getDefaultCwd(c));
  app.get("/api/sessions/title", (c) => controller.generateTitle(c));
}
