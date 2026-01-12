import {
  query,
  type SDKMessage,
  type PermissionResult,
} from "@anthropic-ai/claude-agent-sdk";
import type { ServerEvent, StreamMessage } from "../../types";
import type { PendingPermission } from "../../libs/session-store";

export type RunnerHandle = {
  abort: () => void;
};

export type RunClaudeOptions = {
  sessionId: string;
  prompt: string;
  cwd?: string;
  claudeSessionId?: string;
  onEvent: (event: ServerEvent) => void;
  onSessionUpdate?: (updates: { claudeSessionId?: string }) => void;
};

const DEFAULT_CWD = process.cwd();

export class ClaudeService {
  private activeRunners = new Map<string, AbortController>();
  private pendingPermissions = new Map<
    string,
    Map<string, PendingPermission>
  >();

  async run(options: RunClaudeOptions): Promise<RunnerHandle> {
    const {
      sessionId,
      prompt,
      cwd,
      claudeSessionId,
      onEvent,
      onSessionUpdate,
    } = options;
    const abortController = new AbortController();

    // Store abort controller
    this.activeRunners.set(sessionId, abortController);

    // Initialize pending permissions map for this session
    if (!this.pendingPermissions.has(sessionId)) {
      this.pendingPermissions.set(sessionId, new Map());
    }

    const sessionPendingPermissions = this.pendingPermissions.get(sessionId)!;

    const sendMessage = (message: SDKMessage) => {
      onEvent({
        type: "stream.message",
        payload: { sessionId, message },
      });
    };

    const sendPermissionRequest = (
      toolUseId: string,
      toolName: string,
      input: unknown,
    ) => {
      onEvent({
        type: "permission.request",
        payload: { sessionId, toolUseId, toolName, input },
      });
    };

    // Start the query in the background
    (async () => {
      try {
        const q = query({
          prompt,
          options: {
            cwd: cwd ?? DEFAULT_CWD,
            resume: claudeSessionId,
            abortController,
            env: { ...process.env },
            permissionMode: "bypassPermissions",
            includePartialMessages: true,
            allowDangerouslySkipPermissions: true,
            canUseTool: async (toolName, input, { signal }) => {
              // For AskUserQuestion, we need to wait for user response
              if (toolName === "AskUserQuestion") {
                const toolUseId = crypto.randomUUID();

                // Send permission request to frontend
                sendPermissionRequest(toolUseId, toolName, input);

                // Create a promise that will be resolved when user responds
                return new Promise<PermissionResult>((resolve) => {
                  sessionPendingPermissions.set(toolUseId, {
                    toolUseId,
                    toolName,
                    input,
                    resolve: (result) => {
                      sessionPendingPermissions.delete(toolUseId);
                      resolve(result as PermissionResult);
                    },
                  });

                  // Handle abort
                  signal.addEventListener("abort", () => {
                    sessionPendingPermissions.delete(toolUseId);
                    resolve({ behavior: "deny", message: "Session aborted" });
                  });
                });
              }

              // Auto-approve other tools
              return { behavior: "allow", updatedInput: input };
            },
          },
        });

        // Capture session_id from init message
        for await (const message of q) {
          // Extract session_id from system init message
          if (
            message.type === "system" &&
            "subtype" in message &&
            message.subtype === "init"
          ) {
            const sdkSessionId = message.session_id;
            if (sdkSessionId) {
              onSessionUpdate?.({ claudeSessionId: sdkSessionId });
            }
          }

          // Send message to frontend
          sendMessage(message);

          // Check for result to update session status
          if (message.type === "result") {
            const status =
              message.subtype === "success" ? "completed" : "error";
            onEvent({
              type: "session.status",
              payload: { sessionId, status },
            });
          }
        }

        // Query completed normally
        onEvent({
          type: "session.status",
          payload: { sessionId, status: "completed" },
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          // Session was aborted, don't treat as error
          return;
        }
        onEvent({
          type: "session.status",
          payload: { sessionId, status: "error", error: String(error) },
        });
      } finally {
        // Cleanup
        this.activeRunners.delete(sessionId);
        this.pendingPermissions.delete(sessionId);
      }
    })();

    return {
      abort: () => this.abort(sessionId),
    };
  }

  abort(sessionId: string): void {
    const controller = this.activeRunners.get(sessionId);
    if (controller) {
      controller.abort();
      this.activeRunners.delete(sessionId);
    }
    // Also clean up pending permissions
    this.pendingPermissions.delete(sessionId);
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
    const sessionPermissions = this.pendingPermissions.get(sessionId);
    if (sessionPermissions) {
      const pending = sessionPermissions.get(toolUseId);
      if (pending) {
        pending.resolve(result);
      }
    }
  }

  isRunning(sessionId: string): boolean {
    return this.activeRunners.has(sessionId);
  }
}
