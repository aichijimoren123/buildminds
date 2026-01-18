# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code WebUI is a web-based interface for Claude Code that runs in the browser on desktop, mobile, and iPad. It provides the same Claude Code experience with a WebSocket-based streaming architecture, allowing users to interact with Claude Code from any device while sharing the same configuration as the local CLI tool (`~/.claude/settings.json`).

## Development Commands

### Build and Run
```bash
# Development mode (with hot reload)
bun run dev

# Build for production
bun run build

# Production mode
bun run start

# Run via CLI wrapper
bunx @devagentforge/claude-code-webui@latest
```

### Environment Variables
- `PORT=10086` - Server port (default: 10086)
- `DB_PATH=./webui.db` - SQLite database path
- `CORS_ORIGIN=*` - CORS origins (comma-separated)
- `CLAUDE_CODE_WEBUI_USE_DIST=0` - Set to 0 to use dev mode instead of dist

Claude Code configuration is shared via environment variables:
- `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`
- `ANTHROPIC_DEFAULT_SONNET_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_HAIKU_MODEL`
- `API_TIMEOUT_MS`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`

## Architecture

### Backend (Bun + Hono)

**Entry Point**: [src/index.tsx](src/index.tsx)

The backend is a Bun-based server that:
1. Serves static files (from `dist/` in production or hot-reloaded in dev)
2. Manages WebSocket connections for real-time communication
3. Orchestrates Claude Code sessions via the Claude Agent SDK
4. Persists session data in SQLite (WAL mode)

**Key Components**:
- **Server Setup**: Uses Hono for API routes and Bun's native WebSocket support
- **Session Management** ([src/libs/session-store.ts](src/libs/session-store.ts)): SQLite-backed storage for sessions and messages
  - `sessions` table: session metadata (id, title, status, cwd, claude_session_id)
  - `messages` table: streamed messages linked to sessions
  - In-memory `Map<string, Session>` for active session state
  - Tracks pending permissions and abort controllers
- **Claude Runner** ([src/libs/runner.ts](src/libs/runner.ts)): Wraps Claude Agent SDK's `query()` function
  - Handles session resumption via `claudeSessionId`
  - Auto-approves all tools except `AskUserQuestion` (which requires user response)
  - Streams messages to frontend via WebSocket
  - Manages abort signals for session cancellation

**Event Flow**:
- Client sends `ClientEvent` via WebSocket (e.g., `session.start`, `session.continue`)
- Server processes events in `handleClientEvent()`
- Server broadcasts `ServerEvent` to all connected clients (e.g., `stream.message`, `session.status`)
- Events trigger database updates via `SessionStore` methods

### Frontend (React 19 + TypeScript)

**Entry Point**: [src/App.tsx](src/App.tsx)

**State Management**: Zustand store ([src/store/useAppStore.ts](src/store/useAppStore.ts))
- Centralized state for sessions, messages, and UI state
- `SessionView` type represents frontend session state (includes `messages` and `permissionRequests`)
- Handles all `ServerEvent` types in `handleServerEvent()`
- Maintains `hydrated` flag to track whether session history has been loaded

**WebSocket Connection** ([src/hooks/useWebSocket.ts](src/hooks/useWebSocket.ts)):
- Manages WebSocket lifecycle (connect, reconnect, disconnect)
- Sends `ClientEvent` and receives `ServerEvent`
- Auto-reconnection logic for dropped connections

**Key UI Components**:
- **Sidebar** ([src/components/Sidebar.tsx](src/components/Sidebar.tsx)): Session list, create/delete sessions
- **StartSessionModal** ([src/components/StartSessionModal.tsx](src/components/StartSessionModal.tsx)): Create new session with cwd and prompt
- **PromptInput** ([src/components/PromptInput.tsx](src/components/PromptInput.tsx)): Input for continuing sessions
- **EventCard** ([src/components/EventCard.tsx](src/components/EventCard.tsx)): Renders individual messages (tool calls, results, text)
- **DecisionPanel** ([src/components/DecisionPanel.tsx](src/components/DecisionPanel.tsx)): Handles `AskUserQuestion` permission requests
- **MDContent** ([src/render/markdown.tsx](src/render/markdown.tsx)): Markdown renderer with syntax highlighting

**Partial Message Streaming**:
The app displays partial/streaming assistant messages in real-time:
- Listens for `stream_event` messages with `content_block_delta` events
- Accumulates text in `particalMessageRef` and displays with skeleton loader
- Clears partial message when `content_block_stop` is received

### Type System ([src/types.ts](src/types.ts))

**Core Types**:
- `StreamMessage`: Union of `SDKMessage` (from Agent SDK) and `UserPromptMessage`
- `SessionStatus`: "idle" | "running" | "completed" | "error"
- `SessionInfo`: Basic session metadata for listings
- `ServerEvent`: All server→client event types
- `ClientEvent`: All client→server event types

**Important Distinctions**:
- **Backend `Session`** (in `session-store.ts`): Runtime state with `pendingPermissions` Map and `abortController`
- **Frontend `SessionView`** (in `useAppStore.ts`): UI state with `messages` array and `hydrated` flag
- **Database `StoredSession`**: Persisted session metadata (no messages or runtime state)

## Critical Patterns

### Session Lifecycle
1. User creates session via `StartSessionModal` → `session.start` event
2. Server creates session in DB and starts Claude query
3. Server emits `session.status` with "running"
4. Claude streams messages → server emits `stream.message` events
5. Frontend appends messages to `SessionView.messages`
6. When complete, server emits `session.status` with "completed" or "error"
7. User can continue session via `PromptInput` → `session.continue` event

### Permission Handling (AskUserQuestion)
1. Claude attempts to use `AskUserQuestion` tool
2. `runner.ts` intercepts in `canUseTool()` → generates `toolUseId`
3. Server emits `permission.request` event
4. Frontend displays `DecisionPanel` with question
5. User responds → frontend sends `permission.response` event
6. Server resolves pending promise in `session.pendingPermissions`
7. Claude continues with user's answer

### Session Resumption
- Each Claude session has a `claudeSessionId` (captured from SDK's init message)
- Stored in DB to enable resuming conversations across restarts
- When continuing a session, pass `claudeSessionId` to SDK's `resume` option

### Database Schema
```sql
sessions (
  id TEXT PRIMARY KEY,
  title TEXT,
  claude_session_id TEXT,
  status TEXT,
  cwd TEXT,
  allowed_tools TEXT,
  last_prompt TEXT,
  created_at INTEGER,
  updated_at INTEGER
)

messages (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  data TEXT,  -- JSON-serialized StreamMessage
  created_at INTEGER,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
)
```

## Build System

- **Bundler**: Bun's built-in bundler ([scripts/build.ts](scripts/build.ts))
- **Styling**: Tailwind CSS 4 with `bun-plugin-tailwind`
- **Entry**: [src/index.html](src/index.html) (HTML entry point for bundler)
- **Output**: `dist/` directory with minified, production-ready files
- **Dev Mode**: Hot reload via Bun's `--hot` flag, no build step required

## Path Aliases

TypeScript is configured with path alias `@/*` → `./src/*` (see [tsconfig.json](tsconfig.json)).

## External Dependencies

- `@anthropic-ai/claude-agent-sdk`: Core Claude Code functionality
- `hono`: Lightweight web framework
- `zustand`: State management
- `react-markdown`: Markdown rendering with `remark-gfm`, `rehype-highlight`, `rehype-raw`
- `localforage`: Client-side storage (for future use)
- `@base-ui/react`: Headless UI component library (Menu, Dialog, etc.)
- `better-auth`: Authentication library with OAuth support

## Third-Party UI Component Libraries

### IMPORTANT: Always Use Context7 MCP for Component Usage

**When working with third-party component libraries (Base UI, Radix, Shadcn, etc.), you MUST use the Context7 MCP tool to look up the correct API and usage patterns. DO NOT guess or assume how components work based on other libraries.**

Use the following workflow:
1. Call `mcp__plugin_context7_context7__resolve-library-id` to find the library ID
2. Call `mcp__plugin_context7_context7__query-docs` to get accurate documentation

### Base UI (@base-ui/react) Usage Notes

This project uses Base UI as the headless UI component library. Key patterns:

#### Menu Component
```typescript
// CORRECT: Menu.Popup must be inside Menu.Positioner
<Menu.Root>
  <Menu.Trigger>...</Menu.Trigger>
  <Menu.Portal>
    <Menu.Positioner className="z-50">
      <Menu.Popup>
        <Menu.Item>...</Menu.Item>
      </Menu.Popup>
    </Menu.Positioner>
  </Menu.Portal>
</Menu.Root>

// WRONG: Missing Menu.Positioner causes "MenuPositionerContext is missing" error
<Menu.Portal>
  <Menu.Popup>...</Menu.Popup>
</Menu.Portal>
```

#### Menu.Item Event Handling
```typescript
// For navigation or simple actions, onSelect works:
<Menu.Item onSelect={() => handleSelect(item)}>...</Menu.Item>

// For async operations, OAuth redirects, or opening modals, use onClick instead:
// onSelect may not trigger reliably in these cases
<Menu.Item
  onClick={(e) => {
    e.preventDefault();
    handleAsyncAction();
  }}
>
  ...
</Menu.Item>
```

#### Dialog Component
```typescript
<Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
  <Dialog.Portal>
    <Dialog.Backdrop className="fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-50" />
    <Dialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ...">
      <Dialog.Title>...</Dialog.Title>
      <Dialog.Description>...</Dialog.Description>
      <Dialog.Close>...</Dialog.Close>
    </Dialog.Popup>
  </Dialog.Portal>
</Dialog.Root>
```

### Authentication (better-auth)

#### GitHub OAuth Configuration
When adding OAuth providers, specify the required scopes:
```typescript
// src/server/auth.ts
socialProviders: {
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    // Must include 'repo' scope to access user's repositories
    scope: ["read:user", "user:email", "repo"],
  },
},
```

**Note**: After changing OAuth scopes, users must re-authorize to get new permissions.

## Feature Testing with agent-browser

**IMPORTANT**: For non-trivial feature development (not bug fixes or minor iterations), you MUST use `agent-browser` to verify the implementation works correctly in the browser before considering the task complete.

### When to Test

Use agent-browser for automated testing when:
- Adding new UI components or pages
- Implementing new user-facing features
- Modifying layout or responsive design
- Adding new routes or navigation
- Changing interactive elements (buttons, forms, modals)

Skip automated testing for:
- Bug fixes with clear code-level verification
- Backend-only changes
- Type/lint fixes
- Documentation updates

### Testing Workflow

1. **Start the dev server** (if not running):
```bash
bun run dev &
# Wait for server to start
sleep 3
```

2. **Open the app**:
```bash
agent-browser open http://localhost:10086 --headed
```

3. **Set viewport for desktop testing** (for responsive features):
```bash
agent-browser set viewport 1920 1080
```

4. **Get interactive elements**:
```bash
agent-browser snapshot -i
```

5. **Interact with the UI**:
```bash
agent-browser click @e1           # Click element
agent-browser fill @e2 "text"     # Fill input
agent-browser scroll down 500     # Scroll page
```

6. **Take screenshots** to verify layout:
```bash
agent-browser screenshot /tmp/feature-test.png
```

7. **Test mobile viewport** (if responsive):
```bash
agent-browser set viewport 375 812  # iPhone X
agent-browser reload
agent-browser screenshot /tmp/mobile-test.png
```

8. **Close browser when done**:
```bash
agent-browser close
```

### Example: Testing a New Feature

```bash
# Start server
bun run dev &
sleep 3

# Desktop test
agent-browser open http://localhost:10086 --headed
agent-browser set viewport 1920 1080
agent-browser snapshot -i

# Navigate to feature
agent-browser click @e3  # Click on session
agent-browser wait --load networkidle

# Verify UI elements exist
agent-browser snapshot -i  # Check for expected elements

# Take screenshot for verification
agent-browser screenshot /tmp/desktop-view.png

# Mobile test
agent-browser set viewport 375 812
agent-browser reload
agent-browser screenshot /tmp/mobile-view.png

# Cleanup
agent-browser close
```

### Key Commands Reference

| Command | Description |
|---------|-------------|
| `agent-browser open <url>` | Navigate to page |
| `agent-browser snapshot -i` | Get interactive elements with refs |
| `agent-browser click @e1` | Click element by ref |
| `agent-browser fill @e2 "text"` | Fill input field |
| `agent-browser screenshot <path>` | Save screenshot |
| `agent-browser set viewport W H` | Set viewport size |
| `agent-browser reload` | Reload current page |
| `agent-browser close` | Close browser |
| `agent-browser get text @e1` | Get element text |
| `agent-browser wait --load networkidle` | Wait for page load |

### Verification Checklist

After testing, confirm:
- [ ] Feature renders correctly on desktop (xl viewport)
- [ ] Feature renders correctly on mobile (if responsive)
- [ ] Interactive elements are clickable and functional
- [ ] Navigation works as expected
- [ ] No console errors (check with `agent-browser errors`)
- [ ] Layout matches design requirements
