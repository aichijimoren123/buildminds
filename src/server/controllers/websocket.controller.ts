import type { ClientEvent, WorkTreeInfo, SessionInfo, SessionStatus } from "../../types";
import { SessionService } from "../services/session.service";
import { WebSocketService } from "../services/websocket.service";
import { WorkTreeService } from "../services/worktree.service";
import { generateSessionTitle } from "../../libs/util";
import type { WorkTree, Session } from "../database/schema";

export class WebSocketController {
  private worktreeService: WorkTreeService | null = null;

  constructor(
    private sessionService: SessionService,
    private wsService: WebSocketService,
  ) {}

  /**
   * 设置 WorkTreeService（可选依赖）
   */
  setWorktreeService(worktreeService: WorkTreeService): void {
    this.worktreeService = worktreeService;
  }

  handleOpen(ws: unknown) {
    this.wsService.addClient(ws);
  }

  handleClose(ws: unknown) {
    this.wsService.removeClient(ws);
  }

  async handleMessage(ws: unknown, message: string | Buffer) {
    try {
      const parsed = JSON.parse(String(message)) as ClientEvent;
      await this.handleClientEvent(parsed);
    } catch (error) {
      this.wsService.broadcast({
        type: "runner.error",
        payload: { message: `Invalid message: ${String(error)}` },
      });
    }
  }

  private async handleClientEvent(event: ClientEvent) {
    if (event.type === "session.list") {
      const sessions = await this.sessionService.listSessions();
      this.wsService.broadcast({
        type: "session.list",
        payload: { sessions: sessions.map((s) => this.toSessionInfo(s)) },
      });
      return;
    }

    if (event.type === "session.history") {
      const history = await this.sessionService.getSessionHistory(
        event.payload.sessionId,
      );
      if (!history) {
        this.wsService.broadcast({
          type: "runner.error",
          payload: { message: "Unknown session" },
        });
        return;
      }
      this.wsService.broadcast({
        type: "session.history",
        payload: {
          sessionId: history.session.id,
          status: history.session.status as SessionStatus,
          messages: history.messages,
        },
      });
      return;
    }

    if (event.type === "session.start") {
      // Use provided title or generate a temporary one from prompt
      const tempTitle =
        event.payload.title ||
        event.payload.prompt.slice(0, 50) +
          (event.payload.prompt.length > 50 ? "..." : "");

      const { session } = await this.sessionService.createSession({
        cwd: event.payload.cwd,
        workspaceId: event.payload.workspaceId,
        createWorktree: event.payload.createWorktree,
        title: tempTitle,
        allowedTools: event.payload.allowedTools,
        prompt: event.payload.prompt,
      });

      // Start session immediately without waiting for title generation
      // Use worktree's cwd if available
      this.sessionService.startSession(
        session.id,
        event.payload.prompt,
        tempTitle,
        session.cwd ?? undefined,
      );

      // Generate proper title asynchronously and update
      if (!event.payload.title) {
        generateSessionTitle(event.payload.prompt)
          .then((title) => {
            this.sessionService.updateSessionTitle(session.id, title);
          })
          .catch((error) => {
            console.error("Failed to generate session title:", error);
          });
      }

      return;
    }

    if (event.type === "session.continue") {
      const session = await this.sessionService.getSession(
        event.payload.sessionId,
      );
      if (!session) {
        this.wsService.broadcast({
          type: "runner.error",
          payload: { message: "Unknown session" },
        });
        return;
      }

      // If session has no claudeSessionId yet, it means it was created but never started
      // or the previous run didn't return an init message. Start it as a new session.
      await this.sessionService.startSession(
        session.id,
        event.payload.prompt,
        session.title,
        session.cwd ?? undefined,
      );
      return;
    }

    if (event.type === "session.stop") {
      await this.sessionService.stopSession(event.payload.sessionId);
      return;
    }

    if (event.type === "session.delete") {
      const deleted = await this.sessionService.deleteSession(
        event.payload.sessionId,
      );
      if (!deleted) {
        this.wsService.broadcast({
          type: "runner.error",
          payload: { message: "Unknown session" },
        });
        return;
      }
      this.wsService.broadcast({
        type: "session.deleted",
        payload: { sessionId: event.payload.sessionId },
      });
      return;
    }

    if (event.type === "permission.response") {
      this.sessionService.resolvePermission(
        event.payload.sessionId,
        event.payload.toolUseId,
        event.payload.result,
      );
      return;
    }

    // WorkTree events
    if (event.type === "worktree.list") {
      await this.handleWorktreeList(event.payload.workspaceId);
      return;
    }

    if (event.type === "worktree.changes") {
      await this.handleWorktreeChanges(event.payload.worktreeId);
      return;
    }

    if (event.type === "worktree.diff") {
      await this.handleWorktreeDiff(
        event.payload.worktreeId,
        event.payload.filePath,
      );
      return;
    }

    if (event.type === "worktree.merge") {
      await this.handleWorktreeMerge(event.payload.worktreeId);
      return;
    }

    if (event.type === "worktree.abandon") {
      await this.handleWorktreeAbandon(event.payload.worktreeId);
      return;
    }

    if (event.type === "worktree.createPR") {
      await this.handleWorktreeCreatePR(
        event.payload.worktreeId,
        event.payload.title,
        event.payload.body,
      );
      return;
    }
  }

  // WorkTree event handlers

  private async handleWorktreeList(workspaceId: string) {
    if (!this.worktreeService) {
      this.wsService.broadcast({
        type: "runner.error",
        payload: { message: "WorkTree service not available" },
      });
      return;
    }

    try {
      const worktrees = await this.worktreeService.getByWorkspace(workspaceId);
      this.wsService.broadcast({
        type: "worktree.list",
        payload: {
          workspaceId,
          worktrees: worktrees.map((w) => this.toWorktreeInfo(w)),
        },
      });
    } catch (error) {
      this.wsService.broadcast({
        type: "runner.error",
        payload: { message: `Failed to list worktrees: ${error}` },
      });
    }
  }

  private async handleWorktreeChanges(worktreeId: string) {
    if (!this.worktreeService) {
      this.wsService.broadcast({
        type: "runner.error",
        payload: { message: "WorkTree service not available" },
      });
      return;
    }

    try {
      const changes = await this.worktreeService.getChanges(worktreeId);
      this.wsService.broadcast({
        type: "worktree.changes",
        payload: { worktreeId, changes },
      });
    } catch (error) {
      this.wsService.broadcast({
        type: "runner.error",
        payload: { message: `Failed to get worktree changes: ${error}` },
      });
    }
  }

  private async handleWorktreeDiff(worktreeId: string, filePath: string) {
    if (!this.worktreeService) {
      this.wsService.broadcast({
        type: "runner.error",
        payload: { message: "WorkTree service not available" },
      });
      return;
    }

    try {
      const diff = await this.worktreeService.getFileDiff(worktreeId, filePath);
      this.wsService.broadcast({
        type: "worktree.diff",
        payload: { worktreeId, filePath, diff },
      });
    } catch (error) {
      this.wsService.broadcast({
        type: "runner.error",
        payload: { message: `Failed to get file diff: ${error}` },
      });
    }
  }

  private async handleWorktreeMerge(worktreeId: string) {
    if (!this.worktreeService) {
      this.wsService.broadcast({
        type: "runner.error",
        payload: { message: "WorkTree service not available" },
      });
      return;
    }

    try {
      await this.worktreeService.merge(worktreeId);
      this.wsService.broadcast({
        type: "worktree.merged",
        payload: { worktreeId },
      });
    } catch (error) {
      this.wsService.broadcast({
        type: "runner.error",
        payload: { message: `Failed to merge worktree: ${error}` },
      });
    }
  }

  private async handleWorktreeAbandon(worktreeId: string) {
    if (!this.worktreeService) {
      this.wsService.broadcast({
        type: "runner.error",
        payload: { message: "WorkTree service not available" },
      });
      return;
    }

    try {
      await this.worktreeService.abandon(worktreeId);
      this.wsService.broadcast({
        type: "worktree.abandoned",
        payload: { worktreeId },
      });
    } catch (error) {
      this.wsService.broadcast({
        type: "runner.error",
        payload: { message: `Failed to abandon worktree: ${error}` },
      });
    }
  }

  private async handleWorktreeCreatePR(
    worktreeId: string,
    title: string,
    body?: string,
  ) {
    if (!this.worktreeService) {
      this.wsService.broadcast({
        type: "runner.error",
        payload: { message: "WorkTree service not available" },
      });
      return;
    }

    try {
      const result = await this.worktreeService.createPullRequest(
        worktreeId,
        title,
        body,
      );
      this.wsService.broadcast({
        type: "worktree.prCreated",
        payload: {
          worktreeId,
          url: result.url,
          number: result.number,
        },
      });
    } catch (error) {
      this.wsService.broadcast({
        type: "runner.error",
        payload: { message: `Failed to create PR: ${error}` },
      });
    }
  }

  /**
   * 转换 WorkTree 数据库对象为 API 类型
   */
  private toWorktreeInfo(worktree: WorkTree): WorkTreeInfo {
    return {
      id: worktree.id,
      workspaceId: worktree.workspaceId,
      name: worktree.name,
      branchName: worktree.branchName,
      localPath: worktree.localPath,
      baseBranch: worktree.baseBranch,
      status: worktree.status as WorkTreeInfo["status"],
      changesStats: worktree.changesStats
        ? JSON.parse(worktree.changesStats)
        : undefined,
      createdAt: worktree.createdAt.getTime(),
      updatedAt: worktree.updatedAt.getTime(),
    };
  }

  /**
   * 转换 Session 数据库对象为 API 类型
   */
  private toSessionInfo(session: Session): SessionInfo {
    return {
      id: session.id,
      title: session.title,
      status: session.status as SessionStatus,
      claudeSessionId: session.claudeSessionId ?? undefined,
      cwd: session.cwd ?? undefined,
      worktreeId: session.worktreeId ?? undefined,
      githubRepoId: session.githubRepoId ?? undefined,
      createdAt: session.createdAt.getTime(),
      updatedAt: session.updatedAt.getTime(),
    };
  }
}
