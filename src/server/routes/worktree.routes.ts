import { Hono } from "hono";
import { db } from "../database";
import { authMiddleware } from "../middleware/auth.middleware";
import { WorkTreeRepository } from "../repositories/worktree.repository";
import { GithubRepoRepository } from "../repositories/github-repo.repository";
import { WorkTreeService } from "../services/worktree.service";

type Variables = {
  userId: string;
};

const worktreeRepo = new WorkTreeRepository(db);
const githubRepoRepo = new GithubRepoRepository(db);
const worktreeService = new WorkTreeService(worktreeRepo, githubRepoRepo);

export const worktreeRoutes = new Hono<{ Variables: Variables }>();

// All routes require authentication
worktreeRoutes.use("/*", authMiddleware);

// List worktrees for a workspace (repo)
worktreeRoutes.get("/workspace/:workspaceId", async (c) => {
  try {
    const workspaceId = c.req.param("workspaceId");
    const worktrees = await worktreeService.getByWorkspace(workspaceId);
    return c.json({ worktrees });
  } catch (error) {
    console.error("Failed to list worktrees:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get branches for a workspace
worktreeRoutes.get("/workspace/:workspaceId/branches", async (c) => {
  try {
    const workspaceId = c.req.param("workspaceId");
    const branches = await worktreeService.getBranches(workspaceId);
    return c.json({ branches });
  } catch (error) {
    console.error("Failed to get branches:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Create a new worktree
worktreeRoutes.post("/", async (c) => {
  try {
    const { workspaceId, name, baseBranch } = await c.req.json();

    if (!workspaceId || !name) {
      return c.json({ error: "workspaceId and name are required" }, 400);
    }

    const worktree = await worktreeService.create({
      workspaceId,
      name,
      baseBranch,
    });

    return c.json({ worktree });
  } catch (error) {
    console.error("Failed to create worktree:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get worktree details
worktreeRoutes.get("/:worktreeId", async (c) => {
  try {
    const worktreeId = c.req.param("worktreeId");
    const worktree = await worktreeService.getById(worktreeId);

    if (!worktree) {
      return c.json({ error: "Worktree not found" }, 404);
    }

    return c.json({ worktree });
  } catch (error) {
    console.error("Failed to get worktree:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get worktree status (git status)
worktreeRoutes.get("/:worktreeId/status", async (c) => {
  try {
    const worktreeId = c.req.param("worktreeId");
    const worktree = await worktreeService.getById(worktreeId);

    if (!worktree) {
      return c.json({ error: "Worktree not found" }, 404);
    }

    const stats = await worktreeService.getChangesStats(worktreeId);
    return c.json({ status: worktree.status, stats });
  } catch (error) {
    console.error("Failed to get worktree status:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get worktree file changes
worktreeRoutes.get("/:worktreeId/changes", async (c) => {
  try {
    const worktreeId = c.req.param("worktreeId");
    const changes = await worktreeService.getChanges(worktreeId);
    return c.json({ changes });
  } catch (error) {
    console.error("Failed to get worktree changes:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Update worktree status
worktreeRoutes.patch("/:worktreeId/status", async (c) => {
  try {
    const worktreeId = c.req.param("worktreeId");
    const { status } = await c.req.json();

    if (!status) {
      return c.json({ error: "status is required" }, 400);
    }

    const worktree = await worktreeService.updateStatus(worktreeId, status);
    return c.json({ worktree });
  } catch (error) {
    console.error("Failed to update worktree status:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Commit and push changes (without creating PR)
worktreeRoutes.post("/:worktreeId/commit", async (c) => {
  try {
    const worktreeId = c.req.param("worktreeId");
    const { message } = await c.req.json();

    if (!message) {
      return c.json({ error: "message is required" }, 400);
    }

    const result = await worktreeService.commitAndPush(worktreeId, message);
    return c.json(result);
  } catch (error) {
    console.error("Failed to commit and push:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Create PR from worktree
worktreeRoutes.post("/:worktreeId/pr", async (c) => {
  try {
    const worktreeId = c.req.param("worktreeId");
    const { title, body } = await c.req.json();

    if (!title) {
      return c.json({ error: "title is required" }, 400);
    }

    const result = await worktreeService.createPullRequest(
      worktreeId,
      title,
      body,
    );
    return c.json(result);
  } catch (error) {
    console.error("Failed to create PR:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Merge worktree to main branch
worktreeRoutes.post("/:worktreeId/merge", async (c) => {
  try {
    const worktreeId = c.req.param("worktreeId");
    await worktreeService.merge(worktreeId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to merge worktree:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Abandon worktree
worktreeRoutes.post("/:worktreeId/abandon", async (c) => {
  try {
    const worktreeId = c.req.param("worktreeId");
    await worktreeService.abandon(worktreeId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to abandon worktree:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete worktree
worktreeRoutes.delete("/:worktreeId", async (c) => {
  try {
    const worktreeId = c.req.param("worktreeId");
    await worktreeService.delete(worktreeId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete worktree:", error);
    return c.json({ error: String(error) }, 500);
  }
});
