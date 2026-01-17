import { Menu } from "@base-ui/react/menu";
import {
  ArrowLeft,
  ChevronDown,
  FileCode,
  FilePlus,
  FileMinus,
  GitBranch,
  GitPullRequest,
  Loader2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { CodeViewer } from "../components/CodeViewer";
import { CreatePRDialog } from "../components/CreatePRDialog";
import { useSessionMessages } from "../store/useMessageStore";
import { useSessionsStore } from "../store/useSessionsStore";
import { getFileContent } from "../utils/extractFileContent";

export function Review() {
  const { sessionId, fileIndex } = useParams<{
    sessionId: string;
    fileIndex: string;
  }>();
  const navigate = useNavigate();

  const sessions = useSessionsStore((state) => state.sessions);
  const sessionsLoaded = useSessionsStore((state) => state.sessionsLoaded);
  const session = sessionId ? sessions[sessionId] : undefined;
  const sessionMessages = useSessionMessages(sessionId);

  // Git operation states
  const [isCommitting, setIsCommitting] = useState(false);
  const [showPRDialog, setShowPRDialog] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [commitSuccess, setCommitSuccess] = useState(false);
  const [showNoWorktreeHint, setShowNoWorktreeHint] = useState(false);

  // Get file changes from session
  const fileChanges = session?.fileChanges || [];
  const currentIndex = parseInt(fileIndex || "0", 10);
  const currentFile = fileChanges[currentIndex];

  // Check if session has worktree (can do git operations)
  const hasWorktree = !!session?.worktreeId;

  // Get file content from messages
  const fileContent = useMemo(() => {
    if (!currentFile || !sessionMessages?.messages) return null;
    return getFileContent(sessionMessages.messages, currentFile.path);
  }, [currentFile, sessionMessages?.messages]);

  // Calculate total stats
  const totalStats = useMemo(() => {
    return fileChanges.reduce(
      (acc, file) => ({
        additions: acc.additions + file.additions,
        deletions: acc.deletions + file.deletions,
      }),
      { additions: 0, deletions: 0 },
    );
  }, [fileChanges]);

  // Redirect if invalid (wait for sessions to load first)
  useEffect(() => {
    // Don't redirect until sessions are loaded from server
    if (!sessionsLoaded) return;

    if (!sessionId || !session) {
      navigate("/");
      return;
    }
    if (fileChanges.length === 0) {
      navigate(`/chat/${sessionId}`);
      return;
    }
    if (currentIndex < 0 || currentIndex >= fileChanges.length) {
      navigate(`/chat/${sessionId}/review/0`);
    }
  }, [sessionsLoaded, sessionId, session, fileChanges.length, currentIndex, navigate]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (commitSuccess) {
      const timer = setTimeout(() => setCommitSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [commitSuccess]);

  // Clear no worktree hint after 3 seconds
  useEffect(() => {
    if (showNoWorktreeHint) {
      const timer = setTimeout(() => setShowNoWorktreeHint(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showNoWorktreeHint]);

  const handleBack = () => {
    navigate(`/chat/${sessionId}`);
  };

  const handleFileSelect = (index: number) => {
    navigate(`/chat/${sessionId}/review/${index}`);
  };

  const handleCommitAndPush = async () => {
    if (!session?.worktreeId) {
      setShowNoWorktreeHint(true);
      return;
    }

    setIsCommitting(true);
    setCommitError(null);

    try {
      const response = await fetch(
        `/api/worktrees/${session.worktreeId}/commit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: session.title || "Update from Claude Code",
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to commit and push");
      }

      setCommitSuccess(true);
    } catch (err) {
      setCommitError(
        err instanceof Error ? err.message : "Failed to commit and push",
      );
    } finally {
      setIsCommitting(false);
    }
  };

  const handleCreatePR = () => {
    if (!session?.worktreeId) {
      setShowNoWorktreeHint(true);
      return;
    }
    setShowPRDialog(true);
  };

  // Get file icon based on status
  const getFileIcon = (status: string) => {
    switch (status) {
      case "added":
        return <FilePlus className="w-4 h-4 text-success" />;
      case "deleted":
        return <FileMinus className="w-4 h-4 text-error" />;
      default:
        return <FileCode className="w-4 h-4 text-accent" />;
    }
  };

  if (!currentFile) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-cream">
        <div className="text-center">
          <p className="text-ink-500">No file selected</p>
          <button
            onClick={handleBack}
            className="mt-4 text-accent hover:underline"
          >
            Return to chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-surface-cream">
      {/* Title bar - same style as Chat */}
      <div className="flex items-center py-2 px-4 lg:px-6 border-b border-ink-900/5">
        {/* Back button */}
        <button
          className="shrink-0 mr-2 flex items-center justify-center rounded-lg p-1.5 text-ink-500 hover:bg-ink-900/5 transition-colors"
          onClick={handleBack}
          aria-label="Back to chat"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-1.5 min-w-0 text-ink-800">
          <span className="text-base font-medium truncate">
            Review Changes
          </span>
          <span className="text-sm text-ink-400">
            {fileChanges.length} files
          </span>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats */}
        <div className="flex items-center gap-3 text-sm mr-3">
          {totalStats.additions > 0 && (
            <span className="text-success font-medium">
              +{totalStats.additions}
            </span>
          )}
          {totalStats.deletions > 0 && (
            <span className="text-error font-medium">
              -{totalStats.deletions}
            </span>
          )}
        </div>

        {/* Status indicators */}
        {commitSuccess && (
          <span className="text-xs text-success mr-2">Pushed!</span>
        )}
        {commitError && (
          <span className="text-xs text-error truncate max-w-32 mr-2">
            {commitError}
          </span>
        )}
        {showNoWorktreeHint && (
          <span className="text-xs text-warning mr-2">
            需要关联 GitHub workspace
          </span>
        )}

        {/* Git menu */}
        <Menu.Root>
          <Menu.Trigger
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              hasWorktree
                ? "bg-accent/10 text-accent hover:bg-accent/20"
                : "bg-ink-100 text-ink-500 hover:bg-ink-200"
            }`}
          >
            <GitBranch className="w-4 h-4" />
            <span className="text-sm font-medium">Git</span>
            <ChevronDown className="w-3 h-3" />
          </Menu.Trigger>

          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={8}>
              <Menu.Popup className="min-w-[180px] rounded-xl bg-white py-1 shadow-lg ring-1 ring-ink-900/10 z-50">
                <Menu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-ink-700 cursor-pointer outline-none hover:bg-ink-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={(e) => {
                    e.preventDefault();
                    handleCommitAndPush();
                  }}
                  disabled={isCommitting}
                >
                  {isCommitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>Commit & Push</span>
                </Menu.Item>
                <Menu.Item
                  className="flex items-center gap-2 px-3 py-2 text-sm text-ink-700 cursor-pointer outline-none hover:bg-ink-50 transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    handleCreatePR();
                  }}
                >
                  <GitPullRequest className="w-4 h-4" />
                  <span>Create PR</span>
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* File list sidebar - desktop only */}
        <div className="w-64 shrink-0 border-r border-ink-900/5 bg-white overflow-y-auto hidden md:block">
          <div className="p-2">
            {fileChanges.map((file, index) => {
              const fileName = file.path.split("/").pop() || file.path;
              const isActive = index === currentIndex;

              return (
                <button
                  key={file.path}
                  onClick={() => handleFileSelect(index)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-ink-700 hover:bg-ink-50"
                  }`}
                >
                  {getFileIcon(file.status)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {fileName}
                    </div>
                    <div className="text-xs text-ink-400 truncate">
                      {file.path}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs shrink-0">
                    {file.additions > 0 && (
                      <span className="text-success">+{file.additions}</span>
                    )}
                    {file.deletions > 0 && (
                      <span className="text-error">-{file.deletions}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop: Single file diff view */}
        <div className="hidden md:flex flex-1 overflow-auto p-4 md:p-6">
          {fileContent ? (
            <div className="max-w-4xl mx-auto w-full">
              <CodeViewer
                filePath={currentFile.path}
                oldContent={fileContent.oldContent}
                newContent={fileContent.newContent}
                defaultExpanded={true}
              />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center w-full">
              <div className="text-center">
                <p className="text-ink-500">Unable to load file content</p>
                <p className="text-xs text-ink-400 mt-1">
                  The file may have been created without tracked changes
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mobile: All files with expandable diffs */}
        <div className="md:hidden flex-1 overflow-auto p-4">
          <div className="space-y-3">
            {fileChanges.map((file, index) => {
              const content = getFileContent(sessionMessages?.messages || [], file.path);
              return (
                <CodeViewer
                  key={file.path}
                  filePath={file.path}
                  oldContent={content?.oldContent || ""}
                  newContent={content?.newContent || ""}
                  defaultExpanded={index === 0}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* PR Dialog */}
      {session?.worktreeId && (
        <CreatePRDialog
          open={showPRDialog}
          onClose={() => setShowPRDialog(false)}
          worktreeId={session.worktreeId}
          defaultTitle={session.title}
        />
      )}
    </div>
  );
}
