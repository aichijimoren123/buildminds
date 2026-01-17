import type { SDKAssistantMessage } from "@anthropic-ai/claude-agent-sdk";
import { useEffect } from "react";
import { CodeViewer } from "../CodeViewer";
import { StatusDot } from "./StatusDot";
import { setToolStatus, toolStatusMap, useToolStatus } from "./toolStatus";

type MessageContent = SDKAssistantMessage["message"]["content"];

// Type for Write tool input
type WriteToolInput = {
  file_path?: string;
  content?: string;
};

// Type for Edit tool input
type EditToolInput = {
  file_path?: string;
  old_string?: string;
  new_string?: string;
};

interface ToolUseCardProps {
  messageContent: MessageContent;
  showIndicator?: boolean;
}

export function ToolUseCard({
  messageContent,
  showIndicator = false,
}: ToolUseCardProps) {
  const toolStatus = useToolStatus(messageContent.id);
  const statusVariant = toolStatus === "error" ? "error" : "success";
  const isPending = !toolStatus || toolStatus === "pending";
  const shouldShowDot =
    toolStatus === "success" || toolStatus === "error" || showIndicator;

  useEffect(() => {
    if (messageContent?.id && !toolStatusMap.has(messageContent.id)) {
      setToolStatus(messageContent.id, "pending");
    }
  }, [messageContent?.id]);

  const getToolInfo = (): string | null => {
    switch (messageContent.name) {
      case "Bash":
        return messageContent.input.command || null;
      case "Read":
      case "Write":
      case "Edit":
        return messageContent.input.file_path || null;
      case "Glob":
        return messageContent.input.pattern || null;
      case "Grep":
        return messageContent.input.pattern || null;
      case "Task":
        return messageContent.input.description || null;
      case "WebFetch":
        return messageContent.input.url || null;
      default:
        return null;
    }
  };

  // Check if this is a Write or Edit operation
  const isWriteOp = messageContent.name === "Write";
  const isEditOp = messageContent.name === "Edit";
  const hasCodeContent = isWriteOp || isEditOp;

  // Get code content for display
  const getCodeContent = () => {
    if (isWriteOp) {
      const input = messageContent.input as WriteToolInput;
      return {
        filePath: input.file_path || "",
        oldContent: "", // Write is new file, so oldContent is empty
        newContent: input.content || "",
      };
    }
    if (isEditOp) {
      const input = messageContent.input as EditToolInput;
      return {
        filePath: input.file_path || "",
        oldContent: input.old_string || "",
        newContent: input.new_string || "",
      };
    }
    return null;
  };

  const codeContent = hasCodeContent ? getCodeContent() : null;

  // For Write/Edit, show diff directly without wrapper
  if (hasCodeContent && codeContent) {
    return (
      <div className="mt-4">
        <div className="flex items-center gap-2 mb-2">
          <StatusDot
            variant={statusVariant}
            isActive={isPending && showIndicator}
            isVisible={shouldShowDot}
          />
          <span className="text-sm font-medium text-accent">
            {messageContent.name}
          </span>
          <span className="text-sm text-muted truncate">
            {codeContent.filePath.split("/").pop()}
          </span>
        </div>
        <CodeViewer
          filePath={codeContent.filePath}
          oldContent={codeContent.oldContent}
          newContent={codeContent.newContent}
        />
      </div>
    );
  }

  // For other tools, show compact card
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-bg-300 px-3 py-2 mt-4">
      <div className="flex flex-row items-center gap-2">
        <StatusDot
          variant={statusVariant}
          isActive={isPending && showIndicator}
          isVisible={shouldShowDot}
        />
        <div className="flex flex-row items-center gap-2 tool-use-item flex-1 min-w-0">
          <span className="inline-flex items-center rounded-md text-accent py-0.5 text-sm font-medium shrink-0">
            {messageContent.name}
          </span>
          <span className="text-sm text-muted truncate">{getToolInfo()}</span>
        </div>
      </div>
    </div>
  );
}
