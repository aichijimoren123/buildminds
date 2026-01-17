import type {
  SDKAssistantMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { useEffect, useRef, useState } from "react";
import MDContent from "../../render/markdown";
import { setToolStatus, type ToolStatus } from "./toolStatus";
import { isMarkdown, extractTagContent } from "./utils";

type MessageContent = SDKAssistantMessage["message"]["content"];

const MAX_VISIBLE_LINES = 3;

interface ToolResultProps {
  message: SDKUserMessage;
  messageContent: MessageContent;
}

export function ToolResult({ message, messageContent }: ToolResultProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isFirstRender = useRef(true);

  let lines: string[] = [];
  const toolUseId =
    "tool_use_id" in messageContent &&
    typeof messageContent.tool_use_id === "string"
      ? messageContent.tool_use_id
      : undefined;
  const status: ToolStatus = messageContent.is_error ? "error" : "success";

  const isError = messageContent.is_error;
  if (messageContent.is_error) {
    lines = [extractTagContent(messageContent.content, "tool_use_error") || ""];
  } else {
    try {
      if (Array.isArray(messageContent.content)) {
        lines = messageContent.content
          .map((item: any) => item.text)
          .join("\n")
          .split("\n");
      } else {
        lines = messageContent.content.split("\n");
      }
    } catch (error) {
      console.error("Failed to split content into lines:", error);
      lines = [JSON.stringify(message, null, 2)];
    }
  }

  const isMarkdownContent = isMarkdown(lines.join("\n"));

  const hasMoreLines = lines.length > MAX_VISIBLE_LINES;
  const visibleContent =
    hasMoreLines && !isExpanded
      ? lines.slice(0, MAX_VISIBLE_LINES).join("\n")
      : lines.join("\n");

  useEffect(() => {
    setToolStatus(toolUseId, status);
  }, [toolUseId, status]);

  useEffect(() => {
    if (!hasMoreLines) {
      return;
    }
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [hasMoreLines, isExpanded]);

  return (
    <div className="flex flex-col mt-4">
      <div className="header text-accent-main-100">Output</div>
      <div className="mt-2 rounded-xl bg-bg-300 p-3">
        <pre
          className={`text-sm whitespace-pre-wrap break-words font-mono ${isError ? "text-red-500" : "text-text-200"}`}
        >
          {isMarkdownContent ? (
            <div>
              Markdown
              <MDContent text={visibleContent} />
            </div>
          ) : (
            visibleContent
          )}
        </pre>
        {hasMoreLines && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-sm text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
          >
            <span>{isExpanded ? "▲" : "▼"}</span>
            <span>
              {isExpanded
                ? "Collapse"
                : `Show ${lines.length - MAX_VISIBLE_LINES} more lines`}
            </span>
          </button>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
