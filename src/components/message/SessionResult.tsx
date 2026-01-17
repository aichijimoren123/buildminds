import type { SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";

interface SessionResultProps {
  message: SDKResultMessage;
}

const formatMinutes = (ms: number | undefined) => {
  if (typeof ms !== "number") {
    return "-";
  }
  return `${(ms / 60000).toFixed(2)} min`;
};

const formatUsd = (usd: number | undefined) => {
  if (typeof usd !== "number") {
    return "-";
  }
  return usd.toFixed(2);
};

const formatMillions = (tokens: number | undefined) => {
  if (typeof tokens !== "number") {
    return "-";
  }
  return `${(tokens / 1_000_000).toFixed(4)} M`;
};

export function SessionResult({ message }: SessionResultProps) {
  return (
    <div className="flex flex-col gap-2 mt-4">
      <div className="header text-accent-main-100">Session Result</div>
      <div className="flex flex-col bg-bg-200 border-border-100/10 rounded-xl px-4 py-3 border border-[0.5px] bg-bg-100 space-y-2 dark:bg-bg-300">
        <div className="flex flex-wrap items-center gap-2 text-[14px]">
          <span className="font-normal">Duration</span>
          <span className="inline-flex items-center rounded-full bg-bg-300 px-2.5 py-0.5 text-ink-700 text-[13px]">
            {formatMinutes(message.duration_ms)}
          </span>
          <span className="font-normal">API</span>
          <span className="inline-flex items-center rounded-full bg-bg-300 px-2.5 py-0.5 text-ink-700 text-[13px]">
            {formatMinutes(message.duration_api_ms)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[14px]">
          <span className="font-normal">Usage</span>
          <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-accent text-[13px]">
            Cost ${formatUsd(message.total_cost_usd)}
          </span>
          <span className="inline-flex items-center rounded-full bg-bg-300 px-2.5 py-0.5 text-ink-700 text-[13px]">
            Input {formatMillions(message.usage?.input_tokens)}
          </span>
          <span className="inline-flex items-center rounded-full bg-bg-300 px-2.5 py-0.5 text-ink-700 text-[13px]">
            Output {formatMillions(message.usage?.output_tokens)}
          </span>
        </div>
      </div>
    </div>
  );
}
