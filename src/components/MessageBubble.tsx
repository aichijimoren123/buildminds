import type { ReactNode } from "react";

interface MessageBubbleProps {
  type: "user" | "assistant";
  children: ReactNode;
  className?: string;
}

export function MessageBubble({ type, children, className = "" }: MessageBubbleProps) {
  if (type === "user") {
    return (
      <div className="flex justify-end">
        <div
          className={`max-w-[85%] rounded-2xl rounded-br-md bg-accent text-white px-4 py-3 shadow-soft ${className}`}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[85%] rounded-2xl rounded-bl-md bg-bg-000 border border-border-100/10 px-4 py-3 shadow-soft ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

// Simple wrapper for inline user prompts
export function UserPromptBubble({ text }: { text: string }) {
  return (
    <MessageBubble type="user">
      <div className="text-sm whitespace-pre-wrap">{text}</div>
    </MessageBubble>
  );
}

// Simple wrapper for assistant text responses
export function AssistantBubble({ children }: { children: ReactNode }) {
  return (
    <MessageBubble type="assistant">
      <div className="text-sm text-text-100">{children}</div>
    </MessageBubble>
  );
}
