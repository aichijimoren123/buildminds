import { Collapsible } from "@base-ui/react/collapsible";
import { CheckCircle, ChevronDown, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { ToolStepCard, type ToolStep } from "./ToolStepCard";

interface StepGroupProps {
  steps: ToolStep[];
  defaultExpanded?: boolean;
}

export function StepGroup({ steps, defaultExpanded = false }: StepGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Calculate group status based on individual step statuses
  const allComplete = steps.every((s) => s.status === "success" || s.status === "error");
  const hasError = steps.some((s) => s.status === "error");
  const isRunning = steps.some((s) => s.status === "pending");

  const getStatusIcon = () => {
    if (isRunning) {
      return <Loader2 className="w-4 h-4 text-accent animate-spin" />;
    }
    if (hasError) {
      return <XCircle className="w-4 h-4 text-error" />;
    }
    return <CheckCircle className="w-4 h-4 text-success" />;
  };

  const getStatusText = () => {
    if (isRunning) {
      const pendingCount = steps.filter((s) => s.status === "pending").length;
      const completedCount = steps.length - pendingCount;
      return `Executing step ${completedCount + 1} of ${steps.length}...`;
    }
    if (hasError) {
      const errorCount = steps.filter((s) => s.status === "error").length;
      return `${steps.length} steps (${errorCount} failed)`;
    }
    return `Completed ${steps.length} steps`;
  };

  if (steps.length === 0) return null;

  return (
    <Collapsible.Root open={isExpanded} onOpenChange={setIsExpanded}>
      <Collapsible.Trigger className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-bg-100 border border-border-100/10 hover:bg-bg-200 transition-colors cursor-pointer">
        {getStatusIcon()}
        <span className="flex-1 text-sm font-medium text-text-200 text-left">
          {getStatusText()}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-text-400 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </Collapsible.Trigger>

      <Collapsible.Panel className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="pt-2 space-y-2">
          {steps.map((step, index) => (
            <ToolStepCard key={step.toolId || `step-${index}`} step={step} />
          ))}
        </div>
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
