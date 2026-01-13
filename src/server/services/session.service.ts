import type { StreamMessage, WorkTreeInfo, SessionStatus } from "../../types";
import type { InsertSession, Session, WorkTree } from "../database/schema";
import { MessageRepository } from "../repositories/message.repository";
import { SessionRepository } from "../repositories/session.repository";
import { NotFoundError } from "../utils/errors";
import { ClaudeService } from "./claude.service";
import { WebSocketService } from "./websocket.service";
import { WorkTreeService } from "./worktree.service";

export type SessionHistory = {
  session: Session;
  messages: StreamMessage[];
};

export class SessionService {
  private worktreeService: WorkTreeService | null = null;

  constructor(
    private sessionRepo: SessionRepository,
    private messageRepo: MessageRepository,
    private claudeService: ClaudeService,
    private wsService: WebSocketService,
  ) {}

  /**
   * 设置 WorkTreeService（可选依赖，避免循环依赖）
   */
  setWorktreeService(worktreeService: WorkTreeService): void {
    this.worktreeService = worktreeService;
  }

  async createSession(options: {
    title: string;
    cwd?: string;
    workspaceId?: string;
    allowedTools?: string;
    prompt?: string;
  }): Promise<{ session: Session; worktree?: WorkTree }> {
    // 先创建 session 获取 ID
    const session = await this.sessionRepo.create({
      title: options.title,
      status: "idle",
      cwd: options.cwd,
      allowedTools: options.allowedTools,
      lastPrompt: options.prompt,
      githubRepoId: options.workspaceId,
    });

    let worktree: WorkTree | undefined;

    // 如果指定了 workspaceId 且 worktreeService 可用，创建 WorkTree
    if (options.workspaceId && this.worktreeService) {
      try {
        worktree = await this.worktreeService.createForSession({
          workspaceId: options.workspaceId,
          sessionId: session.id,
          taskName: options.title,
        });

        // 更新 session 的 worktreeId 和 cwd
        await this.sessionRepo.update(session.id, {
          worktreeId: worktree.id,
          cwd: worktree.localPath,
        });

        // 更新返回的 session 对象
        session.worktreeId = worktree.id;
        session.cwd = worktree.localPath;

        // 广播 worktree 创建事件
        this.wsService.broadcast({
          type: "worktree.created",
          payload: { worktree: this.toWorktreeInfo(worktree) },
        });
      } catch (error) {
        console.error("Failed to create worktree:", error);
        // WorkTree 创建失败不影响 session 创建
      }
    }

    return { session, worktree };
  }

  async getSession(id: string): Promise<Session | null> {
    return await this.sessionRepo.findById(id);
  }

  async listSessions(): Promise<Session[]> {
    return await this.sessionRepo.findAll();
  }

  async getSessionHistory(id: string): Promise<SessionHistory | null> {
    const session = await this.sessionRepo.findById(id);
    if (!session) return null;

    const messageRecords = await this.messageRepo.findBySessionId(id);
    const messages = messageRecords.map(
      (msg) => JSON.parse(msg.data) as StreamMessage,
    );

    return {
      session,
      messages,
    };
  }

  async updateSession(
    id: string,
    data: Partial<InsertSession>,
  ): Promise<Session | null> {
    return await this.sessionRepo.update(id, data);
  }

  async updateSessionTitle(id: string, title: string): Promise<void> {
    const session = await this.sessionRepo.findById(id);
    if (!session) return;

    await this.sessionRepo.update(id, { title });

    // Broadcast title update to frontend
    this.wsService.broadcast({
      type: "session.status",
      payload: {
        sessionId: id,
        status: session.status as SessionStatus,
        title,
        cwd: session.cwd ?? undefined,
      },
    });
  }

  async deleteSession(id: string): Promise<boolean> {
    // Stop the session if it's running
    this.claudeService.abort(id);

    // Get session to check for worktree
    const session = await this.sessionRepo.findById(id);

    // Clean up worktree if exists
    if (session?.worktreeId && this.worktreeService) {
      try {
        await this.worktreeService.abandon(session.worktreeId);
      } catch (error) {
        console.error("Failed to cleanup worktree:", error);
      }
    }

    // Delete messages first (should be handled by ON DELETE CASCADE, but being explicit)
    await this.messageRepo.deleteBySessionId(id);

    // Delete the session
    return await this.sessionRepo.delete(id);
  }

  async getRecentCwds(limit = 8): Promise<string[]> {
    return await this.sessionRepo.getRecentCwds(limit);
  }

  async startSession(
    id: string,
    prompt: string,
    title?: string,
    cwd?: string,
  ): Promise<void> {
    const session = await this.sessionRepo.findById(id);
    if (!session) {
      throw new NotFoundError("Session not found");
    }

    // Update status to running
    await this.sessionRepo.update(id, {
      status: "running",
      lastPrompt: prompt,
    });

    // Emit status change
    this.wsService.broadcast({
      type: "session.status",
      payload: {
        sessionId: id,
        status: "running",
        title: title || session.title,
        cwd: cwd ?? session.cwd ?? undefined,
      },
    });

    // Record user prompt
    this.recordMessage(id, {
      type: "user_prompt",
      prompt,
    });

    // Emit user prompt
    this.wsService.broadcast({
      type: "stream.user_prompt",
      payload: { sessionId: id, prompt },
    });

    // Start Claude
    try {
      await this.claudeService.run({
        sessionId: id,
        prompt,
        cwd: session.cwd ?? undefined,
        claudeSessionId: session.claudeSessionId ?? undefined,
        onEvent: (event) => {
          // Handle events from Claude
          if (event.type === "stream.message") {
            this.recordMessage(id, event.payload.message);
          }
          if (event.type === "session.status") {
            this.sessionRepo.update(id, { status: event.payload.status });
          }
          // Broadcast all events
          this.wsService.broadcast(event);
        },
        onSessionUpdate: (updates) => {
          // Update session with claude session id
          this.sessionRepo.update(id, updates);
        },
      });
    } catch (error) {
      await this.sessionRepo.update(id, { status: "error" });
      this.wsService.broadcast({
        type: "session.status",
        payload: {
          sessionId: id,
          status: "error",
          title: session.title,
          cwd: session.cwd ?? undefined,
          error: String(error),
        },
      });
    }
  }

  async stopSession(id: string): Promise<void> {
    const session = await this.sessionRepo.findById(id);
    if (!session) return;

    // Abort the Claude runner
    this.claudeService.abort(id);

    // Update status
    await this.sessionRepo.update(id, { status: "idle" });

    // Emit status change
    this.wsService.broadcast({
      type: "session.status",
      payload: {
        sessionId: id,
        status: "idle",
        title: session.title,
        cwd: session.cwd ?? undefined,
      },
    });
  }

  resolvePermission(
    sessionId: string,
    toolUseId: string,
    result: {
      behavior: "allow" | "deny";
      updatedInput?: unknown;
      message?: string;
    },
  ): void {
    this.claudeService.resolvePermission(sessionId, toolUseId, result);
  }

  private recordMessage(sessionId: string, message: StreamMessage): void {
    const id =
      "uuid" in message && message.uuid
        ? String(message.uuid)
        : crypto.randomUUID();
    this.messageRepo
      .create({
        id,
        sessionId,
        data: JSON.stringify(message),
      })
      .catch((error) => {
        console.error("Failed to record message:", error);
      });
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
}
