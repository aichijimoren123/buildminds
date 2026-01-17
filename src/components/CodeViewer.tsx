import type {
  SupportedLanguages,
  WorkerInitializationRenderOptions,
  WorkerPoolOptions,
} from "@pierre/diffs/react";
import { MultiFileDiff, WorkerPoolContextProvider } from "@pierre/diffs/react";
import { Check, Copy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface CodeViewerProps {
  filePath: string;
  oldContent?: string;
  newContent: string;
  defaultExpanded?: boolean;
}

// Get language from file extension
function getLanguageFromPath(filePath: string): SupportedLanguages {
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
  return (langMap[ext] || "text") as SupportedLanguages;
}

// Count diff stats
function countDiffStats(
  oldContent: string,
  newContent: string,
): { added: number; removed: number } {
  const oldLines = oldContent.split("\n").filter((l) => l.trim());
  const newLines = newContent.split("\n").filter((l) => l.trim());

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

// Init @pierre/diffs worker pool for Bun
function useDiffsWorkerPool() {
  const [state, setState] = useState<{
    poolOptions: WorkerPoolOptions | null;
    highlighterOptions: WorkerInitializationRenderOptions | null;
    error: string | null;
    loading: boolean;
  }>({
    poolOptions: null,
    highlighterOptions: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    try {
      const poolOptions: WorkerPoolOptions = {
        workerFactory: () => new Worker("/pierre-diffs-worker.js"),
        poolSize: 2,
      };

      const highlighterOptions: WorkerInitializationRenderOptions = {
        theme: { dark: "pierre-dark", light: "pierre-light" },
      };

      if (mounted) {
        setState({
          poolOptions,
          highlighterOptions,
          error: null,
          loading: false,
        });
      }
    } catch (err) {
      console.error("Failed to init diff worker:", err);
      if (mounted) {
        setState((prev) => ({
          ...prev,
          error:
            err instanceof Error ? err.message : "Failed to init diff worker",
          loading: false,
        }));
      }
    }

    return () => {
      mounted = false;
    };
  }, []);

  return state;
}

export function CodeViewer({
  filePath,
  oldContent = "",
  newContent,
  defaultExpanded = true,
}: CodeViewerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);
  const { poolOptions, highlighterOptions, error, loading } =
    useDiffsWorkerPool();

  const language = getLanguageFromPath(filePath);
  const fileName = filePath.split("/").pop() || filePath;

  // Calculate stats
  const stats = useMemo(() => {
    const diffStats = countDiffStats(oldContent, newContent);
    const totalLines = newContent.split("\n").length;
    return {
      totalLines,
      added: diffStats.added,
      removed: diffStats.removed,
    };
  }, [oldContent, newContent]);

  // Create FileContents for @pierre/diffs
  const oldFile = useMemo(
    () => ({
      name: filePath,
      contents: oldContent,
      lang: language,
    }),
    [oldContent, filePath, language],
  );

  const newFile = useMemo(
    () => ({
      name: filePath,
      contents: newContent,
      lang: language,
    }),
    [newContent, filePath, language],
  );

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(newContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Diff options - always show line numbers, scroll mode
  const diffOptions = useMemo(
    () => ({
      diffStyle: "unified" as const,
      disableFileHeader: true,
      overflow: "scroll" as const,
      disableLineNumbers: false,
    }),
    [],
  );

  const highlighterOptionsWithLangs = useMemo(() => {
    if (!highlighterOptions) return null;
    return { ...highlighterOptions, langs: [language] };
  }, [highlighterOptions, language]);

  // Render content
  const renderContent = () => {
    if (error) {
      return (
        <div className="p-4 text-sm text-error">
          Failed to load diff viewer: {error}
        </div>
      );
    }

    if (loading || !poolOptions || !highlighterOptionsWithLangs) {
      return (
        <div className="p-4 text-sm text-muted flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      );
    }

    return (
      <WorkerPoolContextProvider
        poolOptions={poolOptions}
        highlighterOptions={highlighterOptionsWithLangs}
      >
        <MultiFileDiff
          oldFile={oldFile}
          newFile={newFile}
          options={diffOptions}
        />
      </WorkerPoolContextProvider>
    );
  };

  return (
    <div className="rounded-xl border border-ink-900/10 bg-white overflow-hidden">
      {/* Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-bg-200 hover:bg-bg-300 transition-colors"
      >
        <span className="flex-1 text-left text-sm font-light text-ink-700 truncate">
          {fileName}
        </span>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="rounded-md hover:bg-bg-400 transition-colors p-1"
          title="Copy code"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-success" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-ink-500" />
          )}
        </button>

        <div className="flex items-center gap-2 text-xs">
          {stats.added > 0 && (
            <span className="text-success">+{stats.added}</span>
          )}
          {stats.removed > 0 && (
            <span className="text-error">-{stats.removed}</span>
          )}
        </div>

        <span className="text-xs text-muted hidden sm:inline">
          {stats.totalLines} lines
        </span>

        <span className="text-xs text-ink-400">{isExpanded ? "▲" : "▼"}</span>
      </div>

      {/* Code content */}
      {isExpanded && (
        <div className="overflow-x-auto pierre-diffs-container max-h-[60vh] sm:max-h-[500px] overflow-y-auto">
          {renderContent()}
        </div>
      )}
    </div>
  );
}
