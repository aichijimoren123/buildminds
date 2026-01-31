import * as fs from "fs/promises";
import * as path from "path";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  size?: number;
  extension?: string;
}

// 需要忽略的目录和文件
const IGNORED_PATTERNS = [
  "node_modules",
  ".git",
  ".next",
  ".nuxt",
  "dist",
  "build",
  ".cache",
  ".turbo",
  "coverage",
  "__pycache__",
  ".pytest_cache",
  ".venv",
  "venv",
  ".env.local",
  ".DS_Store",
  "Thumbs.db",
  ".idea",
  ".vscode",
  "*.log",
  "*.lock",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lock",
];

function shouldIgnore(name: string): boolean {
  return IGNORED_PATTERNS.some((pattern) => {
    if (pattern.includes("*")) {
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, ".*").replace(/\./g, "\\.") + "$"
      );
      return regex.test(name);
    }
    return name === pattern;
  });
}

export class FileSystemService {
  /**
   * 获取目录结构（树形）
   * @param rootPath 根目录路径
   * @param maxDepth 最大深度（默认 3）
   */
  async getDirectoryTree(
    rootPath: string,
    maxDepth: number = 3
  ): Promise<FileNode> {
    const resolvedPath = path.resolve(rootPath);
    const stats = await fs.stat(resolvedPath);

    if (!stats.isDirectory()) {
      throw new Error("Path is not a directory");
    }

    return this.buildTree(resolvedPath, path.basename(resolvedPath), 0, maxDepth);
  }

  private async buildTree(
    fullPath: string,
    name: string,
    currentDepth: number,
    maxDepth: number
  ): Promise<FileNode> {
    const stats = await fs.stat(fullPath);

    if (stats.isFile()) {
      return {
        name,
        path: fullPath,
        type: "file",
        size: stats.size,
        extension: path.extname(name).slice(1) || undefined,
      };
    }

    const node: FileNode = {
      name,
      path: fullPath,
      type: "directory",
      children: [],
    };

    // 如果超过最大深度，不继续展开
    if (currentDepth >= maxDepth) {
      return node;
    }

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });

      // 排序：目录在前，文件在后，按名称字母排序
      const sortedEntries = entries
        .filter((entry) => !shouldIgnore(entry.name))
        .sort((a, b) => {
          if (a.isDirectory() && !b.isDirectory()) return -1;
          if (!a.isDirectory() && b.isDirectory()) return 1;
          return a.name.localeCompare(b.name);
        });

      for (const entry of sortedEntries) {
        const childPath = path.join(fullPath, entry.name);
        try {
          const childNode = await this.buildTree(
            childPath,
            entry.name,
            currentDepth + 1,
            maxDepth
          );
          node.children!.push(childNode);
        } catch (err) {
          // 忽略无法访问的文件/目录
          console.warn(`Cannot access: ${childPath}`);
        }
      }
    } catch (err) {
      console.warn(`Cannot read directory: ${fullPath}`);
    }

    return node;
  }

  /**
   * 获取单个目录的子项（懒加载用）
   */
  async getDirectoryChildren(dirPath: string): Promise<FileNode[]> {
    const resolvedPath = path.resolve(dirPath);
    const stats = await fs.stat(resolvedPath);

    if (!stats.isDirectory()) {
      throw new Error("Path is not a directory");
    }

    const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
    const children: FileNode[] = [];

    const sortedEntries = entries
      .filter((entry) => !shouldIgnore(entry.name))
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

    for (const entry of sortedEntries) {
      const childPath = path.join(resolvedPath, entry.name);
      try {
        const stats = await fs.stat(childPath);
        children.push({
          name: entry.name,
          path: childPath,
          type: entry.isDirectory() ? "directory" : "file",
          size: entry.isFile() ? stats.size : undefined,
          extension: entry.isFile()
            ? path.extname(entry.name).slice(1) || undefined
            : undefined,
          children: entry.isDirectory() ? [] : undefined,
        });
      } catch (err) {
        // 忽略无法访问的文件
      }
    }

    return children;
  }

  /**
   * 读取文件内容
   */
  async readFile(filePath: string): Promise<string> {
    const resolvedPath = path.resolve(filePath);
    const content = await fs.readFile(resolvedPath, "utf-8");
    return content;
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(filePath: string): Promise<{
    name: string;
    path: string;
    size: number;
    extension: string;
    modifiedAt: Date;
  }> {
    const resolvedPath = path.resolve(filePath);
    const stats = await fs.stat(resolvedPath);
    const name = path.basename(resolvedPath);

    return {
      name,
      path: resolvedPath,
      size: stats.size,
      extension: path.extname(name).slice(1) || "",
      modifiedAt: stats.mtime,
    };
  }
}
