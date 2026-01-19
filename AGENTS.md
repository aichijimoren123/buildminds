# Claude Code WebUI — Project Notes

- Purpose: Browser UI for Claude Code with shared local settings; Bun + Hono server, React 19 + Tailwind frontend, SQLite (drizzle) persistence, Better Auth for GitHub OAuth.
- Entrypoint: `src/index.tsx` serves SPA, static assets, `/api/*`, `/ws`; CLI bin `claude-code-webui`.

## Backend
- Routes: `/api/sessions` (no auth, cwd/title helpers), `/api/settings`, `/api/github/*`, `/api/worktrees/*` (auth via Better Auth).
- Services: `SessionService` runs Claude via `ClaudeService.run()` (streams, saves messages/changes, broadcasts WS events); `WorkTreeService` manages git worktrees/merge/PR via shell; `RepositoryService` clones/syncs GitHub repos with bare repo + worktrees.
- Data: SQLite tables for claude_sessions/messages/github_repos/worktrees/settings and Better Auth tables; WAL mode enabled.
- WebSocket: `WebSocketController` handles session lifecycle, permission responses, worktree actions; no auth on WS.

## Frontend
- Routes: `/` start new session, `/chat/:sessionId` conversation, `/chat/:sessionId/review/:fileIndex` review, `/settings`.
- State: Zustand stores (`useAppStore`, `useSessionsStore`, `useTabsStore`, etc.); `useWebSocket` feeds server events; mobile-friendly UI components in `src/components`.

## Risks / Recommendations
- Auth gaps: `/ws` unauthenticated; `/api/sessions/*` unauthenticated. Protect if exposed beyond localhost.
- Better Auth secret defaults to `your-secret-key-change-this-in-production`; must set `BETTER_AUTH_SECRET`.
- Claude tool permissions: `permissionMode: bypassPermissions` + auto-allow for non-AskUserQuestion tools; tighten if user approval required.
- Git command safety: WorkTree/Repo services build shell commands with user-supplied names/paths; rely on sanitized names and trusted env; review for injection/path traversal and permission isolation.
- Error handling: git/gh exec failures sometimes ignored (e.g., worktree deletion/merge); consider stricter checks and state reconciliation.

## Ops Notes
- Key envs: `PORT`, `DB_PATH`, `CORS_ORIGIN`, Claude tokens/models, Better Auth GitHub creds, `BETTER_AUTH_SECRET`, optional `GITHUB_REPOS_PATH`.
- Repo layout for worktrees: `${GITHUB_REPOS_PATH||../claude-repos}/owner-repo/.bare` plus `main` and task worktrees.
