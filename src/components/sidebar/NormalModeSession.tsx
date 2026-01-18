import type { SessionMeta } from "../../store/useSessionsStore";
import { SessionMenu } from "./SessionMenu";
import { formatRelativeTime } from "./utils";

interface NormalModeSessionProps {
  session: SessionMeta;
  isActive: boolean;
  onSelect: (sessionId: string) => void;
  onOpenInCLI: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
}

export function NormalModeSession({
  session,
  isActive,
  onSelect,
  onOpenInCLI,
  onDelete,
}: NormalModeSessionProps) {
  const timeAgo = formatRelativeTime(session.updatedAt);

  return (
    <div
      className={`group cursor-pointer rounded-xl px-3 py-2.5 text-left transition ${
        isActive ? "bg-bg-200" : "hover:bg-bg-200/50"
      }`}
      onClick={() => onSelect(session.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(session.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
          <div
            className={`text-[13px] font-medium truncate ${
              session.status === "running" ? "text-info" : "text-text-100"
            }`}
          >
            {session.title || "Untitled Session"}
          </div>
          <div className="text-xs text-text-400 mt-0.5 truncate">{timeAgo}</div>
        </div>

        <SessionMenu
          sessionId={session.id}
          onOpenInCLI={onOpenInCLI}
          onDelete={onDelete}
          variant="normal"
        />
      </div>
    </div>
  );
}
