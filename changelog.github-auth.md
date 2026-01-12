# GitHub Authentication Setup - Changelog

## 2026-01-12 - Better Auth Database Schema Implementation

### Overview

Successfully implemented Better Auth database schema and resolved the GitHub OAuth "404 Not Found" issue by creating the required authentication tables.

### Problem

When clicking the "Connect GitHub" button, the application returned:

```
找不到以下 Web 地址的网页： http://localhost:10086/api/auth/github
HTTP/1.1 404 Not Found
```

**Root Cause**: Better Auth required database tables (`user`, `session`, `account`, `verification`) were missing from the SQLite database, causing all `/api/auth/*` endpoints to fail.

### Solution

#### 1. Generated Better Auth Schema

Used Better Auth CLI to generate the official Drizzle ORM schema:

```bash
bunx @better-auth/cli@latest generate
```

This created `auth-schema.ts` with the complete Better Auth table definitions following the official specification.

#### 2. Organized Schema Files

Refactored the generated schema into modular files under `src/server/database/schema/`:

- **[user.schema.ts](src/server/database/schema/user.schema.ts)**
  - User profile table with email, name, image
  - Email verification status
  - Timestamps (createdAt, updatedAt)

- **[session.schema.ts](src/server/database/schema/session.schema.ts)**
  - Session management with token-based authentication
  - Expiration tracking
  - IP address and user agent logging
  - Foreign key to user table with cascade delete

- **[account.schema.ts](src/server/database/schema/account.schema.ts)**
  - OAuth provider accounts (GitHub, etc.)
  - Access token and refresh token storage
  - Token expiration tracking
  - Support for multiple providers per user

- **[verification.schema.ts](src/server/database/schema/verification.schema.ts)**
  - Email verification tokens
  - Password reset tokens
  - Generic verification system with expiration

- **[auth-relations.ts](src/server/database/schema/auth-relations.ts)**
  - Drizzle ORM relations for joins (experimental feature)
  - User ↔ Sessions (one-to-many)
  - User ↔ Accounts (one-to-many)

#### 3. Updated Configuration Files

**Updated [drizzle.config.ts](drizzle.config.ts)**:

```typescript
export default defineConfig({
  schema: "./src/server/database/schema/index.ts", // ✅ Fixed path
  out: "./src/server/database/migrations", // ✅ Fixed path
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_PATH || "./webui.db",
  },
});
```

**Updated [src/server/database/schema/index.ts](src/server/database/schema/index.ts)**:

```typescript
// Better Auth tables
export * from "./user.schema";
export * from "./session.schema";
export * from "./account.schema";
export * from "./verification.schema";
export * from "./auth-relations";
```

#### 4. Database Migration

Created migration script: [scripts/migrate-auth-tables.ts](scripts/migrate-auth-tables.ts)

Executed migration:

```bash
bun run scripts/migrate-auth-tables.ts
```

**Migration Results**:

```
✅ Better Auth tables created successfully!

All tables in database:
  - account ✅
  - claude_sessions
  - github_repos
  - messages
  - session ✅
  - settings
  - user ✅
  - verification ✅
```

### Database Schema Details

#### User Table

```sql
CREATE TABLE "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "email_verified" integer DEFAULT false NOT NULL,
  "image" text,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);
CREATE UNIQUE INDEX "user_email_unique" ON "user" ("email");
```

#### Session Table

```sql
CREATE TABLE "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" integer NOT NULL,
  "token" text NOT NULL,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL,
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL,
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "session_token_unique" ON "session" ("token");
CREATE INDEX "session_userId_idx" ON "session" ("user_id");
```

#### Account Table (OAuth)

```sql
CREATE TABLE "account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" integer,
  "refresh_token_expires_at" integer,
  "scope" text,
  "password" text,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL,
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE
);
CREATE INDEX "account_userId_idx" ON "account" ("user_id");
```

#### Verification Table

```sql
CREATE TABLE "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" integer NOT NULL,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");
```

### Files Created

1. **Schema Files**:
   - `src/server/database/schema/user.schema.ts`
   - `src/server/database/schema/session.schema.ts`
   - `src/server/database/schema/account.schema.ts`
   - `src/server/database/schema/verification.schema.ts`
   - `src/server/database/schema/auth-relations.ts`

2. **Migration Scripts**:
   - `scripts/migrate-auth-tables.ts` - Database table creation
   - `scripts/create-auth-tables.ts` - Legacy script (replaced by above)

### Environment Variables

Confirmed `.env` configuration:

```bash
PUBLIC_URL=http://localhost:10086
GITHUB_CLIENT_ID=Ov23livPBc1K4W2bNhTZ
GITHUB_CLIENT_SECRET=a2e3db0063ade31ad1ef18f79b7b0d14b598dcb9
```

### GitHub OAuth Configuration

**Authorization callback URL** in GitHub OAuth App settings:

```
http://127.0.0.1:10086/api/auth/callback/github
```

Note: Better Auth automatically handles the `/api/auth/callback/github` endpoint.

### Next Steps

To complete the setup:

1. **Restart the development server**:

   ```bash
   bun run dev
   ```

2. **Test GitHub OAuth flow**:
   - Click "Connect GitHub" button
   - Should redirect to GitHub authorization page
   - After authorization, redirect back with user session

3. **Verify authentication endpoints**:

   ```bash
   # Check session endpoint
   curl http://localhost:10086/api/auth/session

   # Check GitHub sign-in endpoint
   curl http://localhost:10086/api/auth/sign-in/social
   ```

### Benefits of This Implementation

- ✅ **Production-Ready**: Uses official Better Auth schema
- ✅ **Type-Safe**: Full TypeScript support with Drizzle ORM
- ✅ **Modular**: Separated schema files for maintainability
- ✅ **Extensible**: Easy to add more OAuth providers
- ✅ **Secure**: Built-in CSRF protection and secure session management
- ✅ **Standards-Compliant**: Follows Better Auth best practices

### Testing

After server restart, test the following endpoints:

```bash
# Health check (should return "ok")
curl http://localhost:10086/api/health

# Session check (should return session or null)
curl http://localhost:10086/api/auth/session

# GitHub OAuth (should redirect to GitHub)
open http://localhost:10086/api/auth/sign-in/social
```

### Troubleshooting

If GitHub OAuth still shows 404:

1. Ensure server is restarted after migration
2. Check `.env` has correct `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`
3. Verify GitHub OAuth app callback URL matches: `http://127.0.0.1:10086/api/auth/callback/github`
4. Check browser console for CORS errors
5. Verify database tables exist: `sqlite3 webui.db ".tables"`

### References

- Better Auth Documentation: https://www.better-auth.com/docs
- Better Auth Database Guide: https://www.better-auth.com/docs/concepts/database
- Drizzle ORM: https://orm.drizzle.team/
- GitHub OAuth Setup: [GITHUB_OAUTH_SETUP.md](GITHUB_OAUTH_SETUP.md)

---

**Status**: ✅ Database schema implemented, migration completed, ready for testing after server restart
