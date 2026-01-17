import type {
  SDKAssistantMessage,
  SDKUserMessage,
} from "@anthropic-ai/claude-agent-sdk";
import MDContent from "../../render/markdown";
import { StatusDot } from "./StatusDot";
import { getMessageText } from "./utils";

interface UserMessageCardProps {
  title: string;
  message: SDKAssistantMessage | SDKUserMessage;
  showIndicator?: boolean;
}

export function UserMessageCard({
  title,
  message,
  showIndicator = false,
}: UserMessageCardProps) {
  return (
    <div className="flex flex-col mt-4">
      <div className="header text-accent-main-100 flex items-center gap-2">
        <StatusDot
          variant="success"
          isActive={showIndicator}
          isVisible={showIndicator}
        />
        {title}
      </div>
      {message.message.content.map((msg: any, index: number) => {
        return <MDContent key={index} text={getMessageText(msg)} />;
      })}
    </div>
  );
}
