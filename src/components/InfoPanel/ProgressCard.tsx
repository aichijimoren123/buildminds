import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { SessionStatus } from "../../types";

interface ProgressCardProps {
  status: SessionStatus;
  messageCount: number;
}

export function ProgressCard({ status, messageCount }: ProgressCardProps) {
  const getStatusIcon = () => {
    switch (status) {
      case "running":
        return <Loader2 className="w-4 h-4 text-accent animate-spin" />;
      case "completed":
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "error":
        return <Circle className="w-4 h-4 text-error" />;
      default:
        return <Circle className="w-4 h-4 text-muted" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "running":
        return "Running...";
      case "completed":
        return "Completed";
      case "error":
        return "Error";
      default:
        return "Idle";
    }
  };

  return (
    <div className="rounded-xl border border-ink-900/10 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-ink-900/5">
        <h3 className="text-sm font-medium text-ink-700">Progress</h3>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="flex-1">
            <div className="text-sm font-medium text-ink-700">
              {getStatusText()}
            </div>
            <div className="text-xs text-muted">
              {messageCount} {messageCount === 1 ? "message" : "messages"}
            </div>
          </div>
        </div>

        {status === "running" && (
          <div className="mt-3">
            <div className="h-1.5 bg-bg-200 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full animate-pulse w-1/2" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
