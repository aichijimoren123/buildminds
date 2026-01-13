import type {
  SDKMessage,
  PermissionResult,
} from "@anthropic-ai/claude-agent-sdk";

export type ClaudeSettingsEnv = {
  ANTHROPIC_AUTH_TOKEN: string;
  ANTHROPIC_BASE_URL: string;
  ANTHROPIC_DEFAULT_HAIKU_MODEL: string;
  ANTHROPIC_DEFAULT_OPUS_MODEL: string;
  ANTHROPIC_DEFAULT_SONNET_MODEL: string;
  ANTHROPIC_MODEL: string;
  API_TIMEOUT_MS: string;
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: string;
};

export type UserPromptMessage = {
  type: "user_prompt";
  prompt: string;
};

export type StreamMessage = SDKMessage | UserPromptMessage;

// Session status
export type SessionStatus = "idle" | "running" | "completed" | "error";

// WorkTree status
export type WorkTreeStatus =
  | "active"
  | "pending"
  | "merged"
  | "abandoned"
  | "archived";

// File change info
export type FileChange = {
  path: string;
  status: "added" | "modified" | "deleted";
  additions: number;
  deletions: number;
};

// WorkTree info
export type WorkTreeInfo = {
  id: string;
  workspaceId: string;
  name: string;
  branchName: string;
  localPath: string;
  baseBranch: string;
  status: WorkTreeStatus;
  changesStats?: {
    added: number;
    modified: number;
    deleted: number;
  };
  createdAt: number;
  updatedAt: number;
};

// Session info
export type SessionInfo = {
  id: string;
  title: string;
  status: SessionStatus;
  claudeSessionId?: string;
  cwd?: string;
  worktreeId?: string; // WorkTree 关联
  githubRepoId?: string; // Workspace 关联
  createdAt: number;
  updatedAt: number;
};

// Server -> Client events
export type ServerEvent =
  | {
      type: "stream.message";
      payload: { sessionId: string; message: StreamMessage };
    }
  | {
      type: "stream.user_prompt";
      payload: { sessionId: string; prompt: string };
    }
  | {
      type: "session.status";
      payload: {
        sessionId: string;
        status: SessionStatus;
        title?: string;
        cwd?: string;
        error?: string;
      };
    }
  | { type: "session.list"; payload: { sessions: SessionInfo[] } }
  | {
      type: "session.history";
      payload: {
        sessionId: string;
        status: SessionStatus;
        messages: StreamMessage[];
      };
    }
  | { type: "session.deleted"; payload: { sessionId: string } }
  | {
      type: "permission.request";
      payload: {
        sessionId: string;
        toolUseId: string;
        toolName: string;
        input: unknown;
      };
    }
  | { type: "runner.error"; payload: { sessionId?: string; message: string } }
  // WorkTree events
  | {
      type: "worktree.created";
      payload: { worktree: WorkTreeInfo };
    }
  | {
      type: "worktree.list";
      payload: { workspaceId: string; worktrees: WorkTreeInfo[] };
    }
  | {
      type: "worktree.changes";
      payload: { worktreeId: string; changes: FileChange[] };
    }
  | {
      type: "worktree.diff";
      payload: { worktreeId: string; filePath: string; diff: string };
    }
  | { type: "worktree.merged"; payload: { worktreeId: string } }
  | { type: "worktree.abandoned"; payload: { worktreeId: string } }
  | {
      type: "worktree.prCreated";
      payload: { worktreeId: string; url: string; number: number };
    };

// Client -> Server events
export type ClientEvent =
  | {
      type: "session.start";
      payload: {
        title?: string;
        prompt: string;
        cwd?: string;
        workspaceId?: string; // 可选：指定 Workspace 来创建 WorkTree
        allowedTools?: string;
      };
    }
  | { type: "session.continue"; payload: { sessionId: string; prompt: string } }
  | { type: "session.stop"; payload: { sessionId: string } }
  | { type: "session.delete"; payload: { sessionId: string } }
  | { type: "session.list" }
  | { type: "session.history"; payload: { sessionId: string } }
  | {
      type: "permission.response";
      payload: {
        sessionId: string;
        toolUseId: string;
        result: PermissionResult;
      };
    }
  // WorkTree events
  | { type: "worktree.list"; payload: { workspaceId: string } }
  | { type: "worktree.changes"; payload: { worktreeId: string } }
  | {
      type: "worktree.diff";
      payload: { worktreeId: string; filePath: string };
    }
  | { type: "worktree.merge"; payload: { worktreeId: string } }
  | { type: "worktree.abandon"; payload: { worktreeId: string } }
  | {
      type: "worktree.createPR";
      payload: { worktreeId: string; title: string; body?: string };
    };
