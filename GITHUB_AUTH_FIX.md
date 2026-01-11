# GitHub Authentication Fix Plan

## Problem Analysis

The `/api/auth/github` endpoint returns 404 because:

1. **Table Name Conflict**: Better-auth creates a `session` table, but our app already has a `sessions` table for Claude sessions
2. **Schema Mismatch**: Custom `users` table doesn't match better-auth's expected `user` table structure
3. **Missing Tables**: Better-auth requires `user`, `session`, `account`, and `verification` tables

## Solution

### Step 1: Rename Claude Sessions Table
- Rename `sessions` → `claude_sessions` to avoid conflict with better-auth's `session` table
- Update all references in code

### Step 2: Remove Custom User Schema
- Delete `src/server/db/schema/users.schema.ts`
- Better-auth will manage the `user` table automatically

### Step 3: Define Better-auth Tables in Drizzle
Create a new schema file that defines better-auth's expected tables so we can reference them:

```typescript
// src/server/db/schema/auth.schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Better-auth user table (managed by better-auth but defined for drizzle references)
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId").notNull().references(() => user.id),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId").notNull().references(() => user.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  expiresAt: integer("expiresAt", { mode: "timestamp" }),
  password: text("password"),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp" }).notNull(),
});
```

### Step 4: Update Claude Sessions Schema
```typescript
// src/server/db/schema/claude-sessions.schema.ts
import { user } from "./auth.schema";

export const claudeSessions = sqliteTable("claude_sessions", {
  // ... existing fields
  userId: text("user_id").references(() => user.id),
  // ...
});
```

### Step 5: Generate and Run Migrations
```bash
bun run db:generate
bun run db:migrate
```

### Step 6: Update Code References
- Update all imports and references from `sessions` to `claudeSessions`
- Update repository, service, and controller files

## Alternative: Simpler Approach (Recommended)

Don't try to integrate the schemas. Instead:

1. Keep better-auth completely separate - let it manage its own tables
2. Store user_id as a simple string in claude_sessions (no foreign key constraint)
3. Handle the relationship at the application level, not database level

This avoids:
- Complex schema migrations
- Foreign key constraint issues
- Schema definition conflicts

## Files to Modify

1. `src/server/db/schema/sessions.schema.ts` → rename to `claude-sessions.schema.ts`
2. `src/server/db/schema/index.ts` - update exports
3. `src/server/db/schema/users.schema.ts` - DELETE
4. All repository/service files that reference sessions table
5. Frontend files that reference sessions

## Environment Variables Required

Make sure `.env` has:
```
GITHUB_CLIENT_ID=your_actual_client_id
GITHUB_CLIENT_SECRET=your_actual_client_secret
PUBLIC_URL=http://127.0.0.1:10086
```

Get these from: https://github.com/settings/developers
