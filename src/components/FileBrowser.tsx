import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  FileImage,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useState, useCallback, memo } from "react";

// 文件节点类型
export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  size?: number;
  extension?: string;
}

// 获取文件图标
function getFileIcon(extension?: string) {
  const iconProps = { size: 16, className: "shrink-0" };

  switch (extension?.toLowerCase()) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "mjs":
    case "cjs":
      return <FileCode {...iconProps} className="shrink-0 text-yellow-500" />;
    case "json":
      return <FileJson {...iconProps} className="shrink-0 text-yellow-600" />;
    case "md":
    case "mdx":
    case "txt":
      return <FileText {...iconProps} className="shrink-0 text-text-400" />;
    case "css":
    case "scss":
    case "less":
      return <FileCode {...iconProps} className="shrink-0 text-blue-500" />;
    case "html":
    case "htm":
      return <FileCode {...iconProps} className="shrink-0 text-orange-500" />;
    case "py":
      return <FileCode {...iconProps} className="shrink-0 text-blue-400" />;
    case "go":
      return <FileCode {...iconProps} className="shrink-0 text-cyan-500" />;
    case "rs":
      return <FileCode {...iconProps} className="shrink-0 text-orange-600" />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
    case "ico":
      return <FileImage {...iconProps} className="shrink-0 text-purple-500" />;
    case "sql":
      return <FileCode {...iconProps} className="shrink-0 text-blue-600" />;
    case "yml":
    case "yaml":
      return <FileCode {...iconProps} className="shrink-0 text-red-400" />;
    case "sh":
    case "bash":
    case "zsh":
      return <FileCode {...iconProps} className="shrink-0 text-green-500" />;
    default:
      return <File {...iconProps} className="shrink-0 text-text-400" />;
  }
}

// 格式化文件大小
function formatFileSize(bytes?: number): string {
  if (bytes === undefined) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// 单个树节点组件
interface TreeNodeProps {
  node: FileNode;
  depth: number;
  selectedPath?: string;
  onSelect?: (node: FileNode) => void;
  onExpand?: (node: FileNode) => Promise<FileNode[] | undefined>;
}

const TreeNode = memo(function TreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
  onExpand,
}: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 1);
  const [isLoading, setIsLoading] = useState(false);
  const [children, setChildren] = useState<FileNode[] | undefined>(
    node.children
  );

  const isDirectory = node.type === "directory";
  const isSelected = selectedPath === node.path;

  const handleToggle = useCallback(async () => {
    if (!isDirectory) return;

    if (!isExpanded && onExpand && (!children || children.length === 0)) {
      setIsLoading(true);
      try {
        const loadedChildren = await onExpand(node);
        if (loadedChildren) {
          setChildren(loadedChildren);
        }
      } finally {
        setIsLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  }, [isDirectory, isExpanded, onExpand, children, node]);

  const handleClick = useCallback(() => {
    if (isDirectory) {
      handleToggle();
    }
    onSelect?.(node);
  }, [isDirectory, handleToggle, onSelect, node]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      } else if (e.key === "ArrowRight" && isDirectory && !isExpanded) {
        handleToggle();
      } else if (e.key === "ArrowLeft" && isDirectory && isExpanded) {
        handleToggle();
      }
    },
    [handleClick, handleToggle, isDirectory, isExpanded]
  );

  return (
    <div className="select-none">
      <div
        role="treeitem"
        tabIndex={0}
        aria-expanded={isDirectory ? isExpanded : undefined}
        aria-selected={isSelected}
        className={`
          flex items-center gap-1 py-1 px-2 cursor-pointer rounded-md
          transition-colors duration-100
          hover:bg-bg-200
          ${isSelected ? "bg-accent-main-100/20 text-accent-main-100" : "text-text-200"}
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        {/* 展开/折叠按钮 */}
        <span className="w-4 h-4 flex items-center justify-center shrink-0">
          {isDirectory ? (
            isLoading ? (
              <Loader2 size={14} className="animate-spin text-text-400" />
            ) : isExpanded ? (
              <ChevronDown size={14} className="text-text-400" />
            ) : (
              <ChevronRight size={14} className="text-text-400" />
            )
          ) : null}
        </span>

        {/* 图标 */}
        {isDirectory ? (
          isExpanded ? (
            <FolderOpen size={16} className="shrink-0 text-accent-main-100" />
          ) : (
            <Folder size={16} className="shrink-0 text-accent-main-100" />
          )
        ) : (
          getFileIcon(node.extension)
        )}

        {/* 文件名 */}
        <span className="truncate text-sm flex-1">{node.name}</span>

        {/* 文件大小（仅文件显示） */}
        {!isDirectory && node.size !== undefined && (
          <span className="text-xs text-text-400 shrink-0 ml-2">
            {formatFileSize(node.size)}
          </span>
        )}
      </div>

      {/* 子节点 */}
      {isDirectory && isExpanded && children && children.length > 0 && (
        <div role="group">
          {children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onExpand={onExpand}
            />
          ))}
        </div>
      )}

      {/* 空目录提示 */}
      {isDirectory && isExpanded && children && children.length === 0 && (
        <div
          className="text-xs text-text-400 italic py-1"
          style={{ paddingLeft: `${(depth + 1) * 16 + 28}px` }}
        >
          Empty folder
        </div>
      )}
    </div>
  );
});

// 主文件浏览器组件
export interface FileBrowserProps {
  /** 根目录路径 */
  rootPath: string;
  /** 初始树数据（可选，如果不提供会自动加载） */
  initialTree?: FileNode;
  /** 选中的文件路径 */
  selectedPath?: string;
  /** 文件选中事件 */
  onFileSelect?: (node: FileNode) => void;
  /** 自定义类名 */
  className?: string;
  /** 标题 */
  title?: string;
  /** 是否显示刷新按钮 */
  showRefresh?: boolean;
}

export function FileBrowser({
  rootPath,
  initialTree,
  selectedPath,
  onFileSelect,
  className = "",
  title = "Files",
  showRefresh = true,
}: FileBrowserProps) {
  const [tree, setTree] = useState<FileNode | null>(initialTree || null);
  const [isLoading, setIsLoading] = useState(!initialTree);
  const [error, setError] = useState<string | null>(null);

  // 加载目录树
  const loadTree = useCallback(async () => {
    if (!rootPath) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/filesystem/tree?path=${encodeURIComponent(rootPath)}&depth=2`
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load directory");
      }
      const data = await response.json();
      setTree(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [rootPath]);

  // 初始加载
  useState(() => {
    if (!initialTree && rootPath) {
      loadTree();
    }
  });

  // 懒加载子目录
  const handleExpand = useCallback(
    async (node: FileNode): Promise<FileNode[] | undefined> => {
      try {
        const response = await fetch(
          `/api/filesystem/children?path=${encodeURIComponent(node.path)}`
        );
        if (!response.ok) {
          return undefined;
        }
        const data = await response.json();
        return data.children;
      } catch {
        return undefined;
      }
    },
    []
  );

  // 处理文件选择
  const handleSelect = useCallback(
    (node: FileNode) => {
      if (node.type === "file" && onFileSelect) {
        onFileSelect(node);
      }
    },
    [onFileSelect]
  );

  return (
    <div
      className={`flex flex-col bg-bg-000 border border-border-100/10 rounded-xl overflow-hidden ${className}`}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-100/10 bg-bg-100">
        <h3 className="text-sm font-medium text-text-100">{title}</h3>
        {showRefresh && (
          <button
            onClick={loadTree}
            disabled={isLoading}
            className="p-1 rounded hover:bg-bg-200 text-text-400 hover:text-text-200 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          </button>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-auto p-2" role="tree">
        {isLoading && !tree && (
          <div className="flex items-center justify-center py-8 text-text-400">
            <Loader2 size={20} className="animate-spin mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        )}

        {error && (
          <div className="px-3 py-4 text-sm text-danger-100">
            <p>{error}</p>
            <button
              onClick={loadTree}
              className="mt-2 text-accent-main-100 hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {tree && !error && (
          <TreeNode
            node={tree}
            depth={0}
            selectedPath={selectedPath}
            onSelect={handleSelect}
            onExpand={handleExpand}
          />
        )}

        {!tree && !isLoading && !error && (
          <div className="px-3 py-4 text-sm text-text-400 text-center">
            No directory selected
          </div>
        )}
      </div>
    </div>
  );
}

export default FileBrowser;
