import { Hono } from "hono";
import { FileSystemService } from "../services/filesystem.service";

const filesystemRoutes = new Hono();
const filesystemService = new FileSystemService();

/**
 * GET /api/filesystem/tree
 * 获取目录树结构
 * Query params:
 *   - path: 目录路径 (required)
 *   - depth: 最大深度 (optional, default: 3)
 */
filesystemRoutes.get("/tree", async (c) => {
  const dirPath = c.req.query("path");
  const depth = parseInt(c.req.query("depth") || "3", 10);

  if (!dirPath) {
    return c.json({ error: "Path is required" }, 400);
  }

  try {
    const tree = await filesystemService.getDirectoryTree(dirPath, depth);
    return c.json(tree);
  } catch (err) {
    console.error("Failed to get directory tree:", err);
    return c.json(
      { error: `Failed to read directory: ${(err as Error).message}` },
      500
    );
  }
});

/**
 * GET /api/filesystem/children
 * 获取目录的直接子项（懒加载）
 * Query params:
 *   - path: 目录路径 (required)
 */
filesystemRoutes.get("/children", async (c) => {
  const dirPath = c.req.query("path");

  if (!dirPath) {
    return c.json({ error: "Path is required" }, 400);
  }

  try {
    const children = await filesystemService.getDirectoryChildren(dirPath);
    return c.json({ children });
  } catch (err) {
    console.error("Failed to get directory children:", err);
    return c.json(
      { error: `Failed to read directory: ${(err as Error).message}` },
      500
    );
  }
});

/**
 * GET /api/filesystem/file
 * 读取文件内容
 * Query params:
 *   - path: 文件路径 (required)
 */
filesystemRoutes.get("/file", async (c) => {
  const filePath = c.req.query("path");

  if (!filePath) {
    return c.json({ error: "Path is required" }, 400);
  }

  try {
    const content = await filesystemService.readFile(filePath);
    const info = await filesystemService.getFileInfo(filePath);
    return c.json({ content, info });
  } catch (err) {
    console.error("Failed to read file:", err);
    return c.json(
      { error: `Failed to read file: ${(err as Error).message}` },
      500
    );
  }
});

/**
 * GET /api/filesystem/info
 * 获取文件/目录信息
 * Query params:
 *   - path: 路径 (required)
 */
filesystemRoutes.get("/info", async (c) => {
  const filePath = c.req.query("path");

  if (!filePath) {
    return c.json({ error: "Path is required" }, 400);
  }

  try {
    const info = await filesystemService.getFileInfo(filePath);
    return c.json(info);
  } catch (err) {
    console.error("Failed to get file info:", err);
    return c.json(
      { error: `Failed to get file info: ${(err as Error).message}` },
      500
    );
  }
});

export { filesystemRoutes };
