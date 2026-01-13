import { Hono } from "hono";
import { db } from "../database";
import { authMiddleware } from "../middleware/auth.middleware";
import { GithubRepoRepository } from "../repositories/github-repo.repository";
import { UserRepository } from "../repositories/user.repository";
import { GitHubService } from "../services/github.service";
import { RepositoryService } from "../services/repository.service";

type Variables = {
  userId: string;
};

const userRepo = new UserRepository(db);
const githubRepoRepo = new GithubRepoRepository(db);
const githubService = new GitHubService();
const repositoryService = new RepositoryService(
  githubRepoRepo,
  userRepo,
  githubService,
);

export const githubRoutes = new Hono<{ Variables: Variables }>();

// All routes require authentication
githubRoutes.use("/*", authMiddleware);

// List user's cloned repositories
githubRoutes.get("/repos", async (c) => {
  try {
    const userId = c.get("userId");
    const repos = await repositoryService.listRepositories(userId);
    return c.json({ repos });
  } catch (error) {
    console.error("Failed to list repos:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Browse available GitHub repositories (not yet cloned)
githubRoutes.get("/browse", async (c) => {
  try {
    const userId = c.get("userId");
    console.log("[GitHub Browse] userId:", userId);
    const repos = await repositoryService.listAvailableRepos(userId);
    console.log("[GitHub Browse] repos count:", repos.length);
    return c.json({ repos });
  } catch (error) {
    console.error("[GitHub Browse] Failed to browse repos:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Add (clone) a repository
githubRoutes.post("/repos", async (c) => {
  try {
    const userId = c.get("userId");
    const { repoFullName } = await c.req.json();

    if (!repoFullName) {
      return c.json({ error: "repoFullName is required" }, 400);
    }

    const repo = await repositoryService.addRepository(userId, repoFullName);
    return c.json({ repo });
  } catch (error) {
    console.error("Failed to add repo:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get repository details
githubRoutes.get("/repos/:repoId", async (c) => {
  try {
    const repoId = c.req.param("repoId");
    const repo = await repositoryService.getRepository(repoId);

    if (!repo) {
      return c.json({ error: "Repository not found" }, 404);
    }

    return c.json({ repo });
  } catch (error) {
    console.error("Failed to get repo:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Sync repository (pull latest changes)
githubRoutes.post("/repos/:repoId/sync", async (c) => {
  try {
    const repoId = c.req.param("repoId");
    await repositoryService.syncRepository(repoId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to sync repo:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get repository status
githubRoutes.get("/repos/:repoId/status", async (c) => {
  try {
    const repoId = c.req.param("repoId");
    const status = await repositoryService.getRepoStatus(repoId);
    return c.json({ status });
  } catch (error) {
    console.error("Failed to get repo status:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Commit and push changes
githubRoutes.post("/repos/:repoId/commit", async (c) => {
  try {
    const repoId = c.req.param("repoId");
    const { message } = await c.req.json();

    if (!message) {
      return c.json({ error: "Commit message is required" }, 400);
    }

    await repositoryService.commitAndPush(repoId, message);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to commit and push:", error);
    return c.json({ error: String(error) }, 500);
  }
});

// Delete repository
githubRoutes.delete("/repos/:repoId", async (c) => {
  try {
    const repoId = c.req.param("repoId");
    await repositoryService.removeRepository(repoId);
    return c.json({ success: true });
  } catch (error) {
    console.error("Failed to delete repo:", error);
    return c.json({ error: String(error) }, 500);
  }
});
