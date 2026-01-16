"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FileDiff as FileDiffIcon,
  Copy,
  Check,
} from "lucide-react";

type CodeViewerMode = "code" | "diff";

interface CodeViewerProps {
  filePath: string;
  content?: string;
  oldContent?: string;
  newContent?: string;
  mode?: CodeViewerMode;
  defaultExpanded?: boolean;
}

// Get language from file extension
function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    php: "php",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    md: "markdown",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    dockerfile: "dockerfile",
    toml: "toml",
  };
  return langMap[ext] || "text";
}

// Count lines in content
function countLines(content: string): number {
  return content.split("\n").length;
}

// Count diff stats
function countDiffStats(
  oldContent: string,
  newContent: string,
): { added: number; removed: number } {
  const oldLines = oldContent.split("\n");
  const newLines = newContent.split("\n");

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  let added = 0;
  let removed = 0;

  for (const line of newLines) {
    if (!oldSet.has(line)) added++;
  }

  for (const line of oldLines) {
    if (!newSet.has(line)) removed++;
  }

  return { added, removed };
}

// Lazy load @pierre/diffs components and worker
function usePierreDiffs() {
  const [state, setState] = useState<{
    components: {
      MultiFileDiff: any;
      File: any;
      WorkerPoolContextProvider: any;
    } | null;
    workerFactory: (() => Worker) | null;
    error: string | null;
    loading: boolean;
  }>({
    components: null,
    workerFactory: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      try {
        // Load react components
        const reactModule = await import("@pierre/diffs/react");

        // Create worker factory using the server-provided worker file
        const createWorker = () => {
          return new Worker("/pierre-diffs-worker.js");
        };

        if (mounted) {
          setState({
            components: {
              MultiFileDiff: reactModule.MultiFileDiff,
              File: reactModule.File,
              WorkerPoolContextProvider: reactModule.WorkerPoolContextProvider,
            },
            workerFactory: createWorker,
            error: null,
            loading: false,
          });
        }
      } catch (err) {
        console.error("Failed to load @pierre/diffs:", err);
        if (mounted) {
          setState((prev) => ({
            ...prev,
            error:
              err instanceof Error ? err.message : "Failed to load diff viewer",
            loading: false,
          }));
        }
      }
    }

    loadAll();

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}

export function CodeViewer({
  filePath,
  content,
  oldContent,
  newContent,
  mode = "code",
  defaultExpanded = false,
}: CodeViewerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const { components, workerFactory, error, loading } = usePierreDiffs();

  const language = getLanguageFromPath(filePath);
  const fileName = filePath.split("/").pop() || filePath;

  // Determine what to display
  const displayMode = useMemo(() => {
    if (
      mode === "diff" &&
      oldContent !== undefined &&
      newContent !== undefined
    ) {
      return "diff";
    }
    return "code";
  }, [mode, oldContent, newContent]);

  // Calculate stats
  const stats = useMemo(() => {
    if (displayMode === "diff" && oldContent && newContent) {
      const diffStats = countDiffStats(oldContent, newContent);
      return {
        totalLines: Math.max(countLines(oldContent), countLines(newContent)),
        added: diffStats.added,
        removed: diffStats.removed,
      };
    }
    const codeContent = content || newContent || "";
    return {
      totalLines: countLines(codeContent),
      added: 0,
      removed: 0,
    };
  }, [displayMode, content, oldContent, newContent]);

  // Create FileContents for @pierre/diffs
  const oldFile = useMemo(() => {
    if (displayMode === "diff" && oldContent !== undefined) {
      return {
        name: filePath,
        contents: oldContent,
        lang: language,
      };
    }
    return undefined;
  }, [displayMode, oldContent, filePath, language]);

  const newFile = useMemo(() => {
    if (displayMode === "diff" && newContent !== undefined) {
      return {
        name: filePath,
        contents: newContent,
        lang: language,
      };
    }
    return undefined;
  }, [displayMode, newContent, filePath, language]);

  const singleFile = useMemo(() => {
    if (displayMode === "code") {
      const codeContent = content || newContent || "";
      return {
        name: filePath,
        contents: codeContent,
        lang: language,
      };
    }
    return undefined;
  }, [displayMode, content, newContent, filePath, language]);

  const handleCopy = async () => {
    const textToCopy = content || newContent || "";
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Worker pool options - only create when workerFactory is available
  const poolOptions = useMemo(() => {
    if (!workerFactory) return null;
    return {
      workerFactory,
      poolSize: 2,
    };
  }, [workerFactory]);

  const highlighterOptions = useMemo(
    () => ({
      theme: "github-light" as const,
      langs: [language],
    }),
    [language],
  );

  // Diff options
  const diffOptions = useMemo(
    () => ({
      diffStyle: "unified" as const,
      disableFileHeader: true,
    }),
    [],
  );

  // File options
  const fileOptions = useMemo(
    () => ({
      disableFileHeader: true,
    }),
    [],
  );

  // Render content
  const renderContent = () => {
    if (error) {
      return (
        <div className="p-4 text-sm text-error">
          Failed to load diff viewer: {error}
        </div>
      );
    }

    if (loading || !components || !poolOptions) {
      return (
        <div className="p-4 text-sm text-muted flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      );
    }

    const { MultiFileDiff, File, WorkerPoolContextProvider } = components;

    return (
      <WorkerPoolContextProvider
        poolOptions={poolOptions}
        highlighterOptions={highlighterOptions}
      >
        {displayMode === "diff" && oldFile && newFile ? (
          <MultiFileDiff
            oldFile={oldFile}
            newFile={newFile}
            options={diffOptions}
          />
        ) : singleFile ? (
          <File file={singleFile} options={fileOptions} />
        ) : null}
      </WorkerPoolContextProvider>
    );
  };

  return (
    <div className="mt-3 rounded-xl border border-ink-900/10 bg-white overflow-hidden shadow-soft">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 bg-bg-200 hover:bg-bg-300 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-ink-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-ink-500" />
        )}

        {displayMode === "diff" ? (
          <FileDiffIcon className="w-4 h-4 text-accent" />
        ) : (
          <FileCode className="w-4 h-4 text-accent" />
        )}

        <span className="flex-1 text-left text-sm font-medium text-ink-700 truncate">
          {fileName}
        </span>

        {displayMode === "diff" && (
          <div className="flex items-center gap-2 text-xs">
            {stats.added > 0 && (
              <span className="text-success">+{stats.added}</span>
            )}
            {stats.removed > 0 && (
              <span className="text-error">-{stats.removed}</span>
            )}
          </div>
        )}

        <span className="text-xs text-muted">{stats.totalLines} lines</span>
      </button>

      {/* Code content */}
      {isExpanded && (
        <div className="relative">
          {/* Copy button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-bg-300/80 hover:bg-bg-400 transition-colors"
            title="Copy code"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-success" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-ink-500" />
            )}
          </button>

          <div className="overflow-x-auto pierre-diffs-container max-h-[500px] overflow-y-auto">
            {renderContent()}
          </div>
        </div>
      )}
    </div>
  );
}

// Export a compact inline code preview
export function CodePreview({
  content,
  maxLength = 100,
}: {
  content: string;
  maxLength?: number;
}) {
  const truncated =
    content.length > maxLength ? content.slice(0, maxLength) + "..." : content;

  return (
    <code className="text-xs font-mono bg-bg-200 px-1.5 py-0.5 rounded text-ink-600">
      {truncated}
    </code>
  );
}
