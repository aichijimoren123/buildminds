import MDContent from "../../render/markdown";
import { StatusDot } from "./StatusDot";

interface AssistantBlockCardProps {
  title: string;
  text: string;
  showIndicator?: boolean;
}

export function AssistantBlockCard({
  title,
  text,
  showIndicator = false,
}: AssistantBlockCardProps) {
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
      <MDContent text={text} />
    </div>
  );
}
