import { Dialog } from "@base-ui/react/dialog";
import { useEffect, useRef, useState } from "react";

interface ResumeDialogProps {
  sessionId: string | null;
  onClose: () => void;
}

export function ResumeDialog({ sessionId, onClose }: ResumeDialogProps) {
  const [copied, setCopied] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setCopied(false);
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, [sessionId]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  const handleCopyCommand = async () => {
    if (!sessionId) return;
    const command = `claude --resume ${sessionId}`;
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      return;
    }
    setCopied(true);
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = window.setTimeout(() => {
      onClose();
    }, 3000);
  };

  return (
    <Dialog.Root open={!!sessionId} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-bg-400/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-bg-000 p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold text-text-100">
              Resume in Terminal
            </Dialog.Title>
            <Dialog.Close className="rounded-full p-1 text-text-400 hover:bg-bg-200">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M6 6l12 12M18 6l-12 12" />
              </svg>
            </Dialog.Close>
          </div>
          <p className="mt-2 text-sm text-text-400">
            Run this command in your terminal to resume the session:
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border-100/10 bg-bg-000 px-3 py-2 font-mono text-xs text-text-200">
            <span className="flex-1 break-all">
              {sessionId ? `claude --resume ${sessionId}` : ""}
            </span>
            <button
              className="rounded-lg p-1.5 text-text-300 hover:bg-bg-200"
              onClick={handleCopyCommand}
              aria-label="Copy resume command"
            >
              {copied ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-success"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M5 12l4 4L19 6" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="9" y="9" width="11" height="11" rx="2" />
                  <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                </svg>
              )}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
