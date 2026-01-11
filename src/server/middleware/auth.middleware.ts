import type { Context, Next } from "hono";
import { auth } from "../auth";

export interface AuthContext {
  userId: string;
}

export async function authMiddleware(c: Context, next: Next) {
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    c.set("userId", session.user.id);
    await next();
  } catch (error) {
    return c.json({ error: "Unauthorized" }, 401);
  }
}

export async function optionalAuth(c: Context, next: Next) {
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (session?.user) {
      c.set("userId", session.user.id);
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  await next();
}
