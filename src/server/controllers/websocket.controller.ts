import type { ClientEvent } from "../../types";
import { SessionService } from "../services/session.service";
import { WebSocketService } from "../services/websocket.service";
import { generateSessionTitle } from "../../libs/util";

export class WebSocketController {
  constructor(
    private sessionService: SessionService,
    private wsService: WebSocketService,
  ) {}

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
        payload: { sessions },
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
          status: history.session.status,
          messages: history.messages,
        },
      });
      return;
    }

    if (event.type === "session.start") {
      // Use provided title or generate a temporary one from prompt
      const tempTitle =
        event.payload.title ||
        event.payload.prompt.slice(0, 50) + (event.payload.prompt.length > 50 ? "..." : "");

      const session = await this.sessionService.createSession({
        cwd: event.payload.cwd,
        title: tempTitle,
        allowedTools: event.payload.allowedTools,
        prompt: event.payload.prompt,
      });

      // Start session immediately without waiting for title generation
      this.sessionService.startSession(
        session.id,
        event.payload.prompt,
        tempTitle,
        session.cwd,
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

      if (!session.claudeSessionId) {
        this.wsService.broadcast({
          type: "runner.error",
          payload: {
            sessionId: session.id,
            message: "Session has no resume id yet.",
          },
        });
        return;
      }

      await this.sessionService.startSession(
        session.id,
        event.payload.prompt,
        session.title,
        session.cwd,
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
  }
}
