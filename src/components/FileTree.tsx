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
} from "lucide-react";
import { useState, useCallback, useEffect, memo } from "react";
import type { FileNode } from "./FileBrowser";

// 获取文件图标（精简版）
function getFileIcon(extension?: string, size = 14) {
  const className = "shrink-0";

  switch (extension?.toLowerCase()) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "mjs":
    case "cjs":
      return <FileCode size={size} className={`${className} text-yellow-500`} />;
    case "json":
      return <FileJson size={size} className={`${className} text-yellow-600`} />;
    case "md":
    case "mdx":
    case "txt":
      return <FileText size={size} className={`${className} text-text-400`} />;
    case "css":
    case "scss":
    case "less":
      return <FileCode size={size} className={`${className} text-blue-500`} />;
    case "html":
    case "htm":
      return <FileCode size={size} className={`${className} text-orange-500`} />;
    case "py":
      return <FileCode size={size} className={`${className} text-blue-400`} />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
    case "webp":
      return <FileImage size={size} className={`${className} text-purple-500`} />;
    default:
      return <File size={size} className={`${className} text-text-400`} />;
  }
}

// 树节点
interface MiniTreeNodeProps {
  node: FileNode;
  depth: number;
  selectedPath?: string;
  onSelect?: (node: FileNode) => void;
  onExpand?: (path: string) => Promise<FileNode[]>;
}

const MiniTreeNode = memo(function MiniTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
  onExpand,
}: MiniTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth === 0);
  const [isLoading, setIsLoading] = useState(false);
  const [children, setChildren] = useState<FileNode[] | undefined>(node.children);

  const isDirectory = node.type === "directory";
  const isSelected = selectedPath === node.path;

  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isDirectory) return;

      if (!isExpanded && onExpand && (!children || children.length === 0)) {
        setIsLoading(true);
        try {
          const loadedChildren = await onExpand(node.path);
          setChildren(loadedChildren);
        } finally {
          setIsLoading(false);
        }
      }
      setIsExpanded(!isExpanded);
    },
    [isDirectory, isExpanded, onExpand, children, node.path]
  );

  const handleClick = useCallback(() => {
    onSelect?.(node);
    if (isDirectory) {
      setIsExpanded(!isExpanded);
    }
  }, [node, onSelect, isDirectory, isExpanded]);

  return (
    <div>
      <div
        className={`
          flex items-center gap-1.5 py-0.5 px-1.5 cursor-pointer rounded
          text-[13px] leading-6
          transition-colors duration-75
          hover:bg-bg-200/80
          ${isSelected ? "bg-accent-main-100/15 text-accent-main-000" : "text-text-200"}
        `}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={handleClick}
      >
        {/* 展开图标 */}
        <span
          className="w-4 h-4 flex items-center justify-center shrink-0"
          onClick={handleToggle}
        >
          {isDirectory ? (
            isLoading ? (
              <Loader2 size={12} className="animate-spin text-text-400" />
            ) : isExpanded ? (
              <ChevronDown size={12} className="text-text-400" />
            ) : (
              <ChevronRight size={12} className="text-text-400" />
            )
          ) : null}
        </span>

        {/* 文件/文件夹图标 */}
        {isDirectory ? (
          isExpanded ? (
            <FolderOpen size={14} className="shrink-0 text-accent-main-100" />
          ) : (
            <Folder size={14} className="shrink-0 text-accent-main-100/80" />
          )
        ) : (
          getFileIcon(node.extension)
        )}

        {/* 名称 */}
        <span className="truncate">{node.name}</span>
      </div>

      {/* 子节点 */}
      {isDirectory && isExpanded && children && (
        <div>
          {children.map((child) => (
            <MiniTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onExpand={onExpand}
            />
          ))}
          {children.length === 0 && (
            <div
              className="text-[11px] text-text-400/60 italic py-0.5"
              style={{ paddingLeft: `${(depth + 1) * 12 + 24}px` }}
            >
              Empty
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// 紧凑型文件树组件
export interface FileTreeProps {
  /** 根目录路径 */
  rootPath: string;
  /** 选中的文件路径 */
  selectedPath?: string;
  /** 文件选中事件 */
  onFileSelect?: (node: FileNode) => void;
  /** 自定义类名 */
  className?: string;
  /** 最大高度 */
  maxHeight?: string | number;
}

export function FileTree({
  rootPath,
  selectedPath,
  onFileSelect,
  className = "",
  maxHeight = "400px",
}: FileTreeProps) {
  const [tree, setTree] = useState<FileNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
        throw new Error("Failed to load");
      }
      const data = await response.json();
      setTree(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [rootPath]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // 懒加载子目录
  const handleExpand = useCallback(async (path: string): Promise<FileNode[]> => {
    try {
      const response = await fetch(
        `/api/filesystem/children?path=${encodeURIComponent(path)}`
      );
      if (!response.ok) return [];
      const data = await response.json();
      return data.children || [];
    } catch {
      return [];
    }
  }, []);

  // 处理选择
  const handleSelect = useCallback(
    (node: FileNode) => {
      if (node.type === "file" && onFileSelect) {
        onFileSelect(node);
      }
    },
    [onFileSelect]
  );

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-6 ${className}`}>
        <Loader2 size={16} className="animate-spin text-text-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`px-3 py-4 text-xs text-text-400 ${className}`}>
        Failed to load files
      </div>
    );
  }

  if (!tree) {
    return null;
  }

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ maxHeight }}
    >
      <MiniTreeNode
        node={tree}
        depth={0}
        selectedPath={selectedPath}
        onSelect={handleSelect}
        onExpand={handleExpand}
      />
    </div>
  );
}

export default FileTree;
