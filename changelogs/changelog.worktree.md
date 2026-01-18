# WorkTree Feature - Changelog

## 2026-01-18 - Bare Repository + Worktree Directory Structure Refactor

### Overview

Refactored the repository cloning and worktree architecture to use a bare repository model. All clones and worktrees are now organized under a unified directory structure for better project management.

### New Directory Structure

```
GITHUB_REPOS_PATH/
  └── owner-repo/           # Repository root directory
       ├── .bare/           # Bare repository (hidden)
       ├── main/            # Main branch worktree (default)
       ├── task-abc123/     # Task worktree 1
       └── fix-bug/         # Task worktree 2
```

**Benefits:**
- All worktrees are at the same level, making them easy to find and manage
- IDE-friendly: open the repository folder to see all task branches
- Clean separation: bare repo is hidden, only worktrees are visible
- Follows Git's official recommended worktree workflow

### Files Modified

#### 1. `src/server/services/github.service.ts`

**New Methods:**
- `getRepoRootPath(repoFullName)` - Get repository root directory path
- `getBareRepoPath(repoFullName)` - Get bare repository path (`.bare`)
- `getMainWorktreePath(repoFullName)` - Get main worktree path
- `checkBareRepoExists(repoFullName)` - Check if bare repo exists

**Modified `cloneRepo()`:**
```typescript
async cloneRepo(
  cloneUrl: string,
  repoFullName: string,
  accessToken: string,
  defaultBranch: string = "main",  // NEW: Support custom default branch
): Promise<string>
```

New clone workflow:
1. Create repository root directory
2. Clone as bare repository to `.bare/`
3. Configure fetch refspec for all branches
4. Create main worktree
5. Return main worktree path

**Added `defaultBranch` to `GitHubRepoInfo`:**
```typescript
export interface GitHubRepoInfo {
  // ... existing fields
  defaultBranch: string;  // NEW
}
```

#### 2. `src/server/services/worktree.service.ts`

**New Private Methods:**
- `getBaseRepoPath()` - Get base repo path from env
- `getRepoRootPath(repoFullName)` - Get repository root path
- `getBareRepoPath(repoFullName)` - Get bare repo path

**Updated Methods:**

All methods now execute git commands in the bare repository context:

| Method | Change |
|--------|--------|
| `createForSession()` | Worktree path: `{repoRoot}/task-{sessionId}` |
| `create()` | Worktree path: `{repoRoot}/{sanitizedName}` |
| `merge()` | Execute merge in main worktree |
| `abandon()` | Execute in bare repo |
| `cleanup()` | Execute in bare repo |
| `delete()` | Execute in bare repo |
| `getBranches()` | Fetch from bare repo |

#### 3. `src/server/services/repository.service.ts`

**Modified `addRepository()`:**
- Pass `defaultBranch` to `cloneRepo()`
- Save `branch` field to database

**Modified `removeRepository()`:**
- Delete entire repository root directory (includes bare repo + all worktrees)

**Modified `syncRepository()`:**
- Pass `repo.branch` to `cloneRepo()` when re-cloning

### Migration Notes

**For existing repositories:** Existing repositories using the old structure will need to be re-cloned to use the new bare repo structure.

**Old Structure (deprecated):**
```
GITHUB_REPOS_PATH/
  └── owner-repo/              # Main repository clone
       └── .worktrees/         # Worktrees in hidden directory
           ├── task-1/
           └── task-2/
```

**New Structure:**
```
GITHUB_REPOS_PATH/
  └── owner-repo/
       ├── .bare/              # Bare repository
       ├── main/               # Main branch worktree
       ├── task-1/             # Task worktree
       └── task-2/             # Task worktree
```

### Technical Details

**Bare Repository Configuration:**
```bash
# After cloning bare repo, configure fetch to get all branches
git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
```

**Creating Worktrees from Bare Repo:**
```bash
# Create worktree from bare repo
git -C /path/to/.bare worktree add /path/to/worktree branch-name
```

---

## 2026-01-13 - WorkTree & Workspace Architecture Implementation

### Overview

Successfully implemented WorkTree support for parallel AI task execution. This feature enables isolated git branches and working directories for each coding session, inspired by the Lody product design.

### Core Concept

```
GitHub Repository → Workspace (1:1) → WorkTrees (1:N) → Session (1:1)
```

- **Workspace**: Represents a GitHub repository with its local clone
- **WorkTree**: An isolated git worktree with its own branch and working directory
- **Session**: An AI coding session that operates within a single WorkTree

This architecture ensures:
- Parallel AI tasks don't interfere with each other
- Each task has its own git branch for clean PR creation
- Easy merge/abandon workflow for completed tasks

### Database Changes

#### New Table: `worktrees`

**File**: [src/server/database/schema/worktrees.schema.ts](src/server/database/schema/worktrees.schema.ts)

```sql
CREATE TABLE "worktrees" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "name" text NOT NULL,
  "branch_name" text NOT NULL,
  "local_path" text NOT NULL,
  "base_branch" text NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "changes_stats" text,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL,
  FOREIGN KEY ("workspace_id") REFERENCES "github_repos"("id") ON DELETE CASCADE
);
CREATE INDEX "worktrees_workspace_idx" ON "worktrees" ("workspace_id");
CREATE INDEX "worktrees_status_idx" ON "worktrees" ("status");
```

#### Modified Table: `claude_sessions`

Added `worktree_id` column for 1:1 WorkTree association:

```sql
ALTER TABLE claude_sessions ADD COLUMN worktree_id TEXT REFERENCES worktrees(id) ON DELETE SET NULL;
```

### WorkTree Lifecycle

```
active → pending → merged/abandoned → archived
```

| Status | Description |
|--------|-------------|
| `active` | WorkTree is being used by an active session |
| `pending` | Session completed, awaiting review |
| `merged` | Changes merged to base branch |
| `abandoned` | Changes discarded |
| `archived` | WorkTree removed from filesystem |

### Files Created

#### 1. Database Schema

- **[src/server/database/schema/worktrees.schema.ts](src/server/database/schema/worktrees.schema.ts)**
  - WorkTree table definition with Drizzle ORM
  - Indexes for workspace and status queries
  - Foreign key to `github_repos` table

#### 2. Repository Layer

- **[src/server/repositories/worktree.repository.ts](src/server/repositories/worktree.repository.ts)**
  - CRUD operations for WorkTree records
  - `findByWorkspace(workspaceId)` - Get all worktrees for a workspace
  - `findByWorkspaceAndStatus(workspaceId, status)` - Filter by status
  - `updateStatus(id, status)` - Update lifecycle status

#### 3. Service Layer

- **[src/server/services/worktree.service.ts](src/server/services/worktree.service.ts)**
  - Business logic for WorkTree operations
  - Git command execution for worktree management

Key methods:

```typescript
// Create a new worktree for a session
async createForSession(options: CreateWorkTreeOptions): Promise<WorkTree>

// Get file changes in a worktree
async getChanges(worktreeId: string): Promise<FileChange[]>

// Get diff for a specific file
async getFileDiff(worktreeId: string, filePath: string): Promise<string>

// Merge worktree changes to base branch
async merge(worktreeId: string): Promise<void>

// Abandon and cleanup worktree
async abandon(worktreeId: string): Promise<void>

// Create GitHub PR from worktree
async createPullRequest(worktreeId: string, title: string, body?: string): Promise<{ url: string; number: number }>
```

### Files Modified

#### 1. Session Service Integration

**File**: [src/server/services/session.service.ts](src/server/services/session.service.ts)

- Added optional `WorkTreeService` dependency
- Modified `createSession()` to accept `workspaceId` and auto-create WorkTree
- Modified `deleteSession()` to cleanup associated WorkTree

```typescript
async createSession(options: {
  title: string;
  cwd?: string;
  workspaceId?: string;  // NEW: Creates WorkTree when provided
  allowedTools?: string;
  prompt?: string;
}): Promise<{ session: Session; worktree?: WorkTree }>
```

#### 2. WebSocket Controller

**File**: [src/server/controllers/websocket.controller.ts](src/server/controllers/websocket.controller.ts)

Added WorkTree event handlers:

- `worktree.list` - List all worktrees for a workspace
- `worktree.changes` - Get file changes in a worktree
- `worktree.diff` - Get file diff for a specific file
- `worktree.merge` - Merge worktree to base branch
- `worktree.abandon` - Abandon and cleanup worktree
- `worktree.createPR` - Create GitHub PR from worktree

#### 3. Type Definitions

**File**: [src/types.ts](src/types.ts)

Added new types:

```typescript
// WorkTree status
export type WorkTreeStatus = "active" | "pending" | "merged" | "abandoned" | "archived";

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
  changesStats?: { added: number; modified: number; deleted: number };
  createdAt: number;
  updatedAt: number;
};
```

Added new events:

**Server → Client**:
- `worktree.created` - WorkTree created for session
- `worktree.list` - List of worktrees response
- `worktree.changes` - File changes in worktree
- `worktree.diff` - File diff content
- `worktree.merged` - WorkTree merged successfully
- `worktree.abandoned` - WorkTree abandoned
- `worktree.prCreated` - PR created with URL and number

**Client → Server**:
- `worktree.list` - Request worktree list
- `worktree.changes` - Request file changes
- `worktree.diff` - Request file diff
- `worktree.merge` - Merge worktree
- `worktree.abandon` - Abandon worktree
- `worktree.createPR` - Create PR

#### 4. Route Setup

**File**: [src/server/routes/index.ts](src/server/routes/index.ts)

- Initialize `WorkTreeRepository` and `WorkTreeService`
- Wire up cross-service dependencies

```typescript
const worktreeService = new WorkTreeService(worktreeRepo, githubRepoRepo);
sessionService.setWorktreeService(worktreeService);
wsController.setWorktreeService(worktreeService);
```

### Database Migration

Migration executed via SQLite:

```bash
sqlite3 webui.db <<EOF
CREATE TABLE IF NOT EXISTS worktrees (
  id TEXT PRIMARY KEY NOT NULL,
  workspace_id TEXT NOT NULL REFERENCES github_repos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  local_path TEXT NOT NULL,
  base_branch TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  changes_stats TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS worktrees_workspace_idx ON worktrees(workspace_id);
CREATE INDEX IF NOT EXISTS worktrees_status_idx ON worktrees(status);

ALTER TABLE claude_sessions ADD COLUMN worktree_id TEXT REFERENCES worktrees(id) ON DELETE SET NULL;
EOF
```

### API Usage

#### Create Session with WorkTree

```typescript
// Client sends
{
  type: "session.start",
  payload: {
    prompt: "Fix the login bug",
    workspaceId: "github-repo-id",  // Creates WorkTree automatically
  }
}

// Server broadcasts
{
  type: "worktree.created",
  payload: { worktree: WorkTreeInfo }
}
```

#### Get WorkTree Changes

```typescript
// Client sends
{
  type: "worktree.changes",
  payload: { worktreeId: "worktree-id" }
}

// Server broadcasts
{
  type: "worktree.changes",
  payload: {
    worktreeId: "worktree-id",
    changes: [
      { path: "src/login.ts", status: "modified", additions: 10, deletions: 5 },
      { path: "src/utils.ts", status: "added", additions: 20, deletions: 0 }
    ]
  }
}
```

#### Create Pull Request

```typescript
// Client sends
{
  type: "worktree.createPR",
  payload: {
    worktreeId: "worktree-id",
    title: "Fix login bug",
    body: "This PR fixes the login validation issue..."
  }
}

// Server broadcasts
{
  type: "worktree.prCreated",
  payload: {
    worktreeId: "worktree-id",
    url: "https://github.com/owner/repo/pull/123",
    number: 123
  }
}
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      GitHub Repository                       │
│                    (e.g., owner/my-project)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Workspace                             │
│  - id: "workspace-123"                                       │
│  - localPath: "/repos/my-project"                            │
│  - defaultBranch: "main"                                     │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   WorkTree A    │ │   WorkTree B    │ │   WorkTree C    │
│ branch: task-a  │ │ branch: task-b  │ │ branch: task-c  │
│ status: active  │ │ status: pending │ │ status: merged  │
└─────────────────┘ └─────────────────┘ └─────────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Session A     │ │   Session B     │ │   Session C     │
│ status: running │ │ status: idle    │ │ status: completed│
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Benefits

- **Isolation**: Each AI task operates in its own git worktree
- **Parallelism**: Multiple tasks can run simultaneously without conflicts
- **Clean History**: Each task creates its own branch for easy review
- **Easy Merge**: One-click merge or abandon workflow
- **PR Integration**: Direct GitHub PR creation from worktree

### Future Improvements

- [ ] Frontend UI for WorkTree management
- [ ] WorkTree status visualization in session list
- [ ] Diff viewer component for file changes
- [ ] Conflict resolution when merging
- [ ] WorkTree archival and cleanup automation

---

**Status**: ✅ Backend implementation complete, ready for frontend integration
