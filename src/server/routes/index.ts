import type { Hono } from "hono";
import { db } from "../db";
import { SessionRepository } from "../repositories/session.repository";
import { MessageRepository } from "../repositories/message.repository";
import { SettingsRepository } from "../repositories/settings.repository";
import { WebSocketService } from "../services/websocket.service";
import { ClaudeService } from "../services/claude.service";
import { SessionService } from "../services/session.service";
import { SettingsService } from "../services/settings.service";
import { SessionController } from "../controllers/session.controller";
import { SettingsController } from "../controllers/settings.controller";
import { WebSocketController } from "../controllers/websocket.controller";
import { registerSessionRoutes } from "./session.routes";
import { registerSettingsRoutes } from "./settings.routes";
import { loadClaudeSettingsEnv } from "../../claude-settings";

export function setupRoutes(app: Hono) {
  // Initialize repositories
  const sessionRepo = new SessionRepository(db);
  const messageRepo = new MessageRepository(db);
  const settingsRepo = new SettingsRepository(db);

  // Load Claude settings from database on startup
  // This mimics the behavior in the original index.tsx
  const sessionStoreLike = {
    getAllSettings: () => {
      // Get all settings synchronously from settingsRepo
      // This is a workaround to match the SessionStore interface
      const result: Record<string, string> = {};
      settingsRepo.getAll().then(settings => {
        Object.assign(result, settings);
      });
      return result;
    }
  };
  loadClaudeSettingsEnv(sessionStoreLike as any);

  // Initialize services
  const wsService = new WebSocketService();
  const claudeService = new ClaudeService();
  const sessionService = new SessionService(sessionRepo, messageRepo, claudeService, wsService);
  const settingsService = new SettingsService(settingsRepo);

  // Initialize controllers
  const sessionController = new SessionController(sessionService);
  const settingsController = new SettingsController(settingsService);
  const wsController = new WebSocketController(sessionService, wsService);

  // Register routes
  registerSessionRoutes(app, sessionController);
  registerSettingsRoutes(app, settingsController);

  // Health check endpoint
  app.get("/api/health", (c) => c.text("ok"));

  return { wsController };
}
