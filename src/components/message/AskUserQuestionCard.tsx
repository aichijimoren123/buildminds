import type {
  PermissionResult,
  SDKAssistantMessage,
} from "@anthropic-ai/claude-agent-sdk";
import { useEffect } from "react";
import type { PermissionRequest } from "../../store/useMessageStore";
import { DecisionPanel } from "../DecisionPanel";
import { StatusDot } from "./StatusDot";
import { setToolStatus, toolStatusMap, useToolStatus } from "./toolStatus";

type MessageContent = SDKAssistantMessage["message"]["content"];

export type AskUserQuestionInput = {
  questions?: Array<{
    question: string;
    header?: string;
    options?: Array<{
      label: string;
      description?: string;
    }>;
    multiSelect?: boolean;
  }>;
};

export const getAskUserQuestionSignature = (
  input?: AskUserQuestionInput | null,
) => {
  if (!input?.questions?.length) return "";
  return input.questions
    .map((question) => {
      const options = (question.options ?? [])
        .map((option) => `${option.label}|${option.description ?? ""}`)
        .join(",");
      return `${question.question}|${question.header ?? ""}|${question.multiSelect ? "1" : "0"}|${options}`;
    })
    .join("||");
};

interface AskUserQuestionCardProps {
  messageContent: MessageContent;
  permissionRequests?: PermissionRequest[];
  onPermissionResponse?: (
    request: PermissionRequest,
    result: PermissionResult,
  ) => void;
  showIndicator?: boolean;
}

export function AskUserQuestionCard({
  messageContent,
  permissionRequests,
  onPermissionResponse,
  showIndicator = false,
}: AskUserQuestionCardProps) {
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

  const input = messageContent.input as AskUserQuestionInput | null;
  const questions = input?.questions ?? [];
  const signature = getAskUserQuestionSignature(input);
  const matchingRequest = permissionRequests?.find((request) => {
    if (request.toolName !== "AskUserQuestion") return false;
    const requestSignature = getAskUserQuestionSignature(
      request.input as AskUserQuestionInput | null,
    );
    return requestSignature !== "" && requestSignature === signature;
  });

  if (matchingRequest && onPermissionResponse) {
    return (
      <div className="mt-4">
        <DecisionPanel
          request={matchingRequest}
          onSubmit={(result) => onPermissionResponse(matchingRequest, result)}
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-accent/20 bg-accent-subtle p-5 mt-4">
      <div className="text-xs font-semibold text-accent flex items-center gap-2">
        <StatusDot
          variant={statusVariant}
          isActive={isPending && showIndicator}
          isVisible={shouldShowDot}
        />
        Question from Claude
      </div>

      {questions.length === 0 && (
        <div className="mt-3 text-sm text-ink-700">User input requested.</div>
      )}

      {questions.map((q, qIndex) => (
        <div key={qIndex} className="mt-4">
          <p className="text-sm text-ink-700">{q.question}</p>
          {q.header && (
            <span className="mt-2 inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
              {q.header}
            </span>
          )}
          <div className="mt-3 grid gap-2">
            {(q.options ?? []).map((option, optIndex) => (
              <div
                key={optIndex}
                className="rounded-xl border border-ink-900/10 bg-surface px-4 py-3 text-left text-sm text-ink-700"
              >
                <div className="font-medium">{option.label}</div>
                {option.description && (
                  <div className="mt-1 text-xs text-muted">
                    {option.description}
                  </div>
                )}
              </div>
            ))}
          </div>
          {q.multiSelect && (
            <div className="mt-2 text-xs text-muted">
              Multiple selections allowed.
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
