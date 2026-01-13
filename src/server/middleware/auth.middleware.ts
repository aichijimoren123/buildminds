import type { Context, Next } from "hono";
import { auth } from "../auth";

export interface AuthContext {
  userId: string;
}

export async function authMiddleware(c: Context, next: Next) {
  try {
    console.log("[AuthMiddleware] Checking session...");
    console.log("[AuthMiddleware] Cookie header:", c.req.header("cookie"));
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });
    console.log("[AuthMiddleware] Session:", session ? "found" : "not found", session?.user?.id);

    if (!session?.user) {
      console.log("[AuthMiddleware] No user in session");
      return c.json({ error: "Unauthorized" }, 401);
    }

    c.set("userId", session.user.id);
    await next();
  } catch (error) {
    console.error("[AuthMiddleware] Error:", error);
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
