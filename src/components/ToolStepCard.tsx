import { Collapsible } from "@base-ui/react/collapsible";
import { CheckCircle, ChevronDown, Loader2, XCircle } from "lucide-react";
import { useState } from "react";

export type ToolStepStatus = "pending" | "success" | "error";

export interface ToolStep {
  toolName: string;
  toolId: string;
  input: unknown;
  status: ToolStepStatus;
  result?: string;
  isError?: boolean;
}

interface ToolStepCardProps {
  step: ToolStep;
}

export function ToolStepCard({ step }: ToolStepCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (step.status) {
      case "pending":
        return <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />;
      case "error":
        return <XCircle className="w-3.5 h-3.5 text-error" />;
      case "success":
        return <CheckCircle className="w-3.5 h-3.5 text-success" />;
    }
  };

  const getToolInfo = (): string | null => {
    const input = step.input as Record<string, unknown>;
    switch (step.toolName) {
      case "Bash":
        return (input.command as string) || null;
      case "Read":
      case "Write":
      case "Edit":
        return (input.file_path as string) || null;
      case "Glob":
      case "Grep":
        return (input.pattern as string) || null;
      case "Task":
        return (input.description as string) || null;
      case "WebFetch":
        return (input.url as string) || null;
      default:
        return null;
    }
  };

  const toolInfo = getToolInfo();
  const hasResult = step.result && step.result.trim().length > 0;

  return (
    <div className="rounded-xl bg-bg-000 border border-border-100/5 overflow-hidden">
      <Collapsible.Root open={isExpanded} onOpenChange={setIsExpanded}>
        <Collapsible.Trigger
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bg-300/50 transition-colors cursor-pointer"
          disabled={!hasResult}
        >
          {getStatusIcon()}
          <div className="flex-1 flex items-center gap-2 min-w-0 text-left">
            <span className="text-xs font-medium text-accent shrink-0">
              {step.toolName}
            </span>
            {toolInfo && (
              <span className="text-xs text-text-400 truncate">{toolInfo}</span>
            )}
          </div>
          {hasResult && (
            <ChevronDown
              className={`w-3.5 h-3.5 text-text-400 transition-transform duration-200 shrink-0 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          )}
        </Collapsible.Trigger>

        {hasResult && (
          <Collapsible.Panel className="overflow-hidden">
            <div className="px-3 pb-2 pt-1 border-t border-border-100/5">
              <pre
                className={`text-xs whitespace-pre-wrap break-words font-mono max-h-40 overflow-y-auto ${
                  step.isError ? "text-error" : "text-text-300"
                }`}
              >
                {step.result}
              </pre>
            </div>
          </Collapsible.Panel>
        )}
      </Collapsible.Root>
    </div>
  );
}
