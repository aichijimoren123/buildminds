import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./database";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
  }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
  },
  baseURL: process.env.PUBLIC_URL || "http://localhost:10086",
  trustedOrigins: [process.env.PUBLIC_URL || "http://localhost:10086"],
  secret: process.env.BETTER_AUTH_SECRET || "your-secret-key-change-this-in-production",
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60, // 1 hour
    },
  },
});

export type Auth = typeof auth;
