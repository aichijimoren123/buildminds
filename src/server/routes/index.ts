import type { Hono } from "hono";
import { loadClaudeSettingsEnv } from "../../claude-settings";
import { auth } from "../auth";
import { SessionController } from "../controllers/session.controller";
import { SettingsController } from "../controllers/settings.controller";
import { WebSocketController } from "../controllers/websocket.controller";
import { db } from "../database";
import { GithubRepoRepository } from "../repositories/github-repo.repository";
import { MessageRepository } from "../repositories/message.repository";
import { SessionRepository } from "../repositories/session.repository";
import { SettingsRepository } from "../repositories/settings.repository";
import { WorkTreeRepository } from "../repositories/worktree.repository";
import { ClaudeService } from "../services/claude.service";
import { SessionService } from "../services/session.service";
import { SettingsService } from "../services/settings.service";
import { WebSocketService } from "../services/websocket.service";
import { WorkTreeService } from "../services/worktree.service";
import { githubRoutes } from "./github.routes";
import { registerSessionRoutes } from "./session.routes";
import { registerSettingsRoutes } from "./settings.routes";
import { worktreeRoutes } from "./worktree.routes";

export function setupRoutes(app: Hono) {
  // Initialize repositories
  const sessionRepo = new SessionRepository(db);
  const messageRepo = new MessageRepository(db);
  const settingsRepo = new SettingsRepository(db);
  const githubRepoRepo = new GithubRepoRepository(db);
  const worktreeRepo = new WorkTreeRepository(db);

  // Load Claude settings from database on startup
  // This mimics the behavior in the original index.tsx
  const sessionStoreLike = {
    getAllSettings: () => {
      // Get all settings synchronously from settingsRepo
      // This is a workaround to match the SessionStore interface
      const result: Record<string, string> = {};
      settingsRepo.getAll().then((settings) => {
        Object.assign(result, settings);
      });
      return result;
    },
  };
  loadClaudeSettingsEnv(sessionStoreLike as any);

  // Initialize services
  const wsService = new WebSocketService();
  const claudeService = new ClaudeService();
  const worktreeService = new WorkTreeService(worktreeRepo, githubRepoRepo);
  const sessionService = new SessionService(
    sessionRepo,
    messageRepo,
    claudeService,
    wsService,
  );
  const settingsService = new SettingsService(settingsRepo);

  // Set up cross-service dependencies
  sessionService.setWorktreeService(worktreeService);

  // Initialize controllers
  const sessionController = new SessionController(sessionService);
  const settingsController = new SettingsController(settingsService);
  const wsController = new WebSocketController(sessionService, wsService);

  // Set up worktree service in controllers
  wsController.setWorktreeService(worktreeService);

  // Register routes
  registerSessionRoutes(app, sessionController);
  registerSettingsRoutes(app, settingsController);

  // Better Auth routes - handles all /api/auth/* endpoints automatically
  app.on(["GET", "POST"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
  });

  app.route("/api/github", githubRoutes);
  app.route("/api/worktrees", worktreeRoutes);

  // Health check endpoint
  app.get("/api/health", (c) => c.text("ok"));

  return { wsController };
}
