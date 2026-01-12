import type { Context } from "hono";
import { SessionService } from "../services/session.service";
import { generateSessionTitle } from "../../libs/util";

export class SessionController {
  constructor(private sessionService: SessionService) {}

  async getRecentCwds(c: Context) {
    try {
      const limitParam = c.req.query("limit");
      const limit = limitParam ? Number(limitParam) : 8;
      const boundedLimit = Number.isFinite(limit)
        ? Math.min(Math.max(limit, 1), 20)
        : 8;
      const cwds = await this.sessionService.getRecentCwds(boundedLimit);
      return c.json({ cwds });
    } catch (error) {
      return c.json({ error: String(error) }, 500);
    }
  }

  async generateTitle(c: Context) {
    try {
      const userInput = c.req.query("userInput") || null;
      const title = await generateSessionTitle(userInput);
      return c.json({ title });
    } catch (error) {
      return c.json({ error: String(error) }, 500);
    }
  }

  async getDefaultCwd(c: Context) {
    try {
      const defaultCwd = process.cwd();
      return c.json({ cwd: defaultCwd });
    } catch (error) {
      return c.json({ error: String(error) }, 500);
    }
  }
}
