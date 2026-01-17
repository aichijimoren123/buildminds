import { Dialog } from "@base-ui/react/dialog";
import { ExternalLink, GitPullRequest, Loader2, X } from "lucide-react";
import { useState } from "react";

interface CreatePRDialogProps {
  open: boolean;
  onClose: () => void;
  worktreeId: string;
  defaultTitle?: string;
}

export function CreatePRDialog({
  open,
  onClose,
  worktreeId,
  defaultTitle = "",
}: CreatePRDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; number: number } | null>(
    null,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/worktrees/${worktreeId}/pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create PR");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create PR");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle(defaultTitle);
    setBody("");
    setError(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-5 w-5 text-accent" />
              <Dialog.Title className="text-lg font-semibold text-ink-900">
                Create Pull Request
              </Dialog.Title>
            </div>
            <button
              onClick={handleClose}
              className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {result ? (
            // Success state
            <div className="space-y-4">
              <div className="rounded-lg bg-success/10 p-4 text-center">
                <p className="text-success font-medium mb-2">
                  PR #{result.number} created successfully!
                </p>
                <a
                  href={result.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
                >
                  View on GitHub
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              <button
                onClick={handleClose}
                className="w-full rounded-lg bg-ink-100 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-200 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            // Form state
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="pr-title"
                  className="block text-sm font-medium text-ink-700 mb-1.5"
                >
                  Title
                </label>
                <input
                  id="pr-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter PR title..."
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="pr-body"
                  className="block text-sm font-medium text-ink-700 mb-1.5"
                >
                  Description (optional)
                </label>
                <textarea
                  id="pr-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Describe your changes..."
                  rows={4}
                  className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-lg bg-ink-100 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-200 transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!title.trim() || isLoading}
                  className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create PR"
                  )}
                </button>
              </div>
            </form>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
