import type {
  PermissionResult,
  SDKAssistantMessage,
} from "@anthropic-ai/claude-agent-sdk";
import type { StreamMessage } from "../../types";
import type { PermissionRequest } from "../../store/useMessageStore";
import MDContent from "../../render/markdown";
import { AskUserQuestionCard } from "./AskUserQuestionCard";
import { AssistantBlockCard } from "./AssistantBlockCard";
import { SessionResult } from "./SessionResult";
import { StatusDot } from "./StatusDot";
import { SystemInfoCard } from "./SystemInfoCard";
import { ToolResult } from "./ToolResult";
import { ToolUseCard } from "./ToolUseCard";
import { toolUseMap } from "./toolStatus";
import { UserMessageCard } from "./UserMessageCard";
import { getMessageText } from "./utils";

type MessageContent = SDKAssistantMessage["message"]["content"];

interface MessageCardProps {
  message: StreamMessage;
  showIndicator?: boolean;
  permissionRequests?: PermissionRequest[];
  onPermissionResponse?: (
    request: PermissionRequest,
    result: PermissionResult,
  ) => void;
}

export function MessageCard({
  message,
  showIndicator = false,
  permissionRequests,
  onPermissionResponse,
}: MessageCardProps) {
  // System init message
  if (
    message.type === "system" &&
    "subtype" in message &&
    message.subtype === "init"
  ) {
    return <SystemInfoCard message={message} showIndicator={showIndicator} />;
  }

  if (message.type === "assistant" && message.message.content) {
    return message.message.content.map((messageContent: any, index: number) => {
      const isLastBlock = index === message.message.content.length - 1;
      const blockIndicator = showIndicator && isLastBlock;
      const key =
        typeof messageContent.id === "string"
          ? messageContent.id
          : `${messageContent.type}-${index}`;

      if (messageContent.type === "thinking") {
        const text =
          typeof messageContent.thinking === "string"
            ? messageContent.thinking
            : getMessageText(messageContent);
        return (
          <AssistantBlockCard
            key={key}
            title="Thinking"
            text={text}
            showIndicator={blockIndicator}
          />
        );
      }

      if (messageContent.type === "text") {
        const text =
          typeof messageContent.text === "string"
            ? messageContent.text
            : getMessageText(messageContent);
        return (
          <AssistantBlockCard
            key={key}
            title="Assistant"
            text={text}
            showIndicator={blockIndicator}
          />
        );
      }

      if (messageContent.type === "tool_use") {
        toolUseMap.set(messageContent.id, messageContent.name);
        if (messageContent.name === "AskUserQuestion") {
          return (
            <AskUserQuestionCard
              key={key}
              messageContent={messageContent}
              permissionRequests={permissionRequests}
              onPermissionResponse={onPermissionResponse}
              showIndicator={blockIndicator}
            />
          );
        }
        return (
          <ToolUseCard
            key={key}
            messageContent={messageContent}
            showIndicator={blockIndicator}
          />
        );
      }

      return (
        <div
          key={key}
          className="rounded-xl border border-border-100/10 bg-bg-000 pb-4 pt-0 px-4 shadow-soft"
        >
          <div>Unsupported assistant block</div>
          <pre className="mt-2 whitespace-pre-wrap text-sm text-text-300 font-mono">
            {JSON.stringify(messageContent, null, 2)}
          </pre>
        </div>
      );
    });
  }

  // User tool result
  if (
    message.type === "user" &&
    message.message.content &&
    message.message.content[0].type === "tool_result"
  ) {
    return message.message.content.map(
      (messageContent: MessageContent, index: number) => {
        return (
          <ToolResult
            key={index}
            message={message}
            messageContent={messageContent}
          />
        );
      },
    );
  }

  if (message.type === "user" && message.message.role === "user") {
    return (
      <UserMessageCard
        title="User"
        message={message}
        showIndicator={showIndicator}
      />
    );
  }

  if (message.type === "user_prompt") {
    return (
      <div className="flex flex-col mt-4">
        <div className="header text-accent-main-100 flex items-center gap-2">
          <StatusDot
            variant="success"
            isActive={showIndicator}
            isVisible={showIndicator}
          />
          User
        </div>
        <MDContent text={message.prompt} />
      </div>
    );
  }

  if (message.type === "stream_event") return null;

  if (message.type === "result") {
    return <SessionResult message={message} />;
  }

  // Fallback for unknown message types
  return (
    <div className="rounded-xl border border-border-100/10 bg-bg-000 pb-4 pt-0 px-4 shadow-soft">
      <div>Unsupport message type {Math.floor(Date.now() / 1000)}</div>
      <pre className="mt-2 whitespace-pre-wrap text-sm text-text-300 font-mono">
        {JSON.stringify(message, null, 2)}
      </pre>
    </div>
  );
}

// Re-export as EventCard for backward compatibility
export const EventCard = MessageCard;
