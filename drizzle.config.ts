import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/database/schema/index.ts",
  out: "./src/server/database/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DB_PATH || "./webui.db",
  },
  verbose: true,
  strict: true,
});
