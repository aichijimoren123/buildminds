import type { StreamMessage } from "../../types";
import type { InsertSession, Session } from "../database/schema";
import { MessageRepository } from "../repositories/message.repository";
import { SessionRepository } from "../repositories/session.repository";
import { NotFoundError } from "../utils/errors";
import { ClaudeService } from "./claude.service";
import { WebSocketService } from "./websocket.service";

export type SessionHistory = {
  session: Session;
  messages: StreamMessage[];
};

export class SessionService {
  constructor(
    private sessionRepo: SessionRepository,
    private messageRepo: MessageRepository,
    private claudeService: ClaudeService,
    private wsService: WebSocketService
  ) {}

  async createSession(options: {
    title: string;
    cwd?: string;
    allowedTools?: string;
    prompt?: string;
  }): Promise<Session> {
    const session = await this.sessionRepo.create({
      title: options.title,
      status: "idle",
      cwd: options.cwd,
      allowedTools: options.allowedTools,
      lastPrompt: options.prompt,
    });

    return session;
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
    const messages = messageRecords.map((msg) => JSON.parse(msg.data) as StreamMessage);

    return {
      session,
      messages,
    };
  }

  async updateSession(id: string, data: Partial<InsertSession>): Promise<Session | null> {
    return await this.sessionRepo.update(id, data);
  }

  async deleteSession(id: string): Promise<boolean> {
    // Stop the session if it's running
    this.claudeService.abort(id);

    // Delete messages first (should be handled by ON DELETE CASCADE, but being explicit)
    await this.messageRepo.deleteBySessionId(id);

    // Delete the session
    return await this.sessionRepo.delete(id);
  }

  async getRecentCwds(limit = 8): Promise<string[]> {
    return await this.sessionRepo.getRecentCwds(limit);
  }

  async startSession(id: string, prompt: string, title?: string, cwd?: string): Promise<void> {
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
        cwd: cwd || session.cwd,
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
        cwd: session.cwd,
        claudeSessionId: session.claudeSessionId,
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
          cwd: session.cwd,
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
      payload: { sessionId: id, status: "idle", title: session.title, cwd: session.cwd },
    });
  }

  resolvePermission(sessionId: string, toolUseId: string, result: { behavior: "allow" | "deny"; updatedInput?: unknown; message?: string }): void {
    this.claudeService.resolvePermission(sessionId, toolUseId, result);
  }

  private recordMessage(sessionId: string, message: StreamMessage): void {
    const id = ('uuid' in message && message.uuid) ? String(message.uuid) : crypto.randomUUID();
    this.messageRepo.create({
      id,
      sessionId,
      data: JSON.stringify(message),
    }).catch((error) => {
      console.error("Failed to record message:", error);
    });
  }
}
