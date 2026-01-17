import type { SDKSystemMessage } from "@anthropic-ai/claude-agent-sdk";
import { StatusDot } from "./StatusDot";

interface SystemInfoCardProps {
  message: SDKSystemMessage;
  showIndicator?: boolean;
}

function InfoItem({ name, value }: { name: string; value: string }) {
  return (
    <div className="text-[14px]">
      <span className="mr-4 font-normal">{name}</span>
      <span className="font-light">{value}</span>
    </div>
  );
}

export function SystemInfoCard({
  message,
  showIndicator = false,
}: SystemInfoCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="header text-accent-main-100 font-serif flex items-center gap-2">
        <StatusDot
          variant="success"
          isActive={showIndicator}
          isVisible={showIndicator}
        />
        System Init
      </div>
      <div className="flex flex-col bg-bg-200 border-border-100/10 rounded-xl px-4 py-2 border border-[0.5px] [&_label]:hidden space-y-1 dark:bg-bg-200">
        <InfoItem name="Session ID" value={message.session_id} />
        <InfoItem name="Model Name" value={message.model} />
        <InfoItem name="Permission Mode" value={message.permissionMode} />
        <InfoItem name="Working Directory" value={message.cwd} />
      </div>
    </div>
  );
}
