import { Menu } from "@base-ui/react/menu";
import { MoreHorizontal, Terminal, Trash2 } from "lucide-react";

interface SessionMenuProps {
  sessionId: string;
  onOpenInCLI: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  variant?: "normal" | "code";
}

export function SessionMenu({
  sessionId,
  onOpenInCLI,
  onDelete,
  variant = "normal",
}: SessionMenuProps) {
  const iconClass = variant === "code" ? "w-3.5 h-3.5" : "w-4 h-4";
  const buttonClass =
    variant === "code"
      ? "shrink-0 rounded p-1 text-text-400 hover:bg-bg-300 opacity-0 group-hover:opacity-100 transition-opacity"
      : "shrink-0 rounded-full p-1 text-text-400 hover:bg-bg-300 opacity-0 group-hover:opacity-100 transition-opacity";

  return (
    <Menu.Root>
      <Menu.Trigger
        className={buttonClass}
        aria-label="Open session menu"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <MoreHorizontal className={iconClass} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-50">
          <Menu.Popup className="min-w-[180px] rounded-xl border border-border-100/10 bg-bg-000 p-1 shadow-lg">
            <Menu.Item
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-200 outline-none hover:bg-bg-100"
              onClick={(e) => {
                e.preventDefault();
                onOpenInCLI(sessionId);
              }}
            >
              <Terminal className="w-4 h-4 text-text-400" />
              {variant === "code" ? "Open in CLI" : "Resume in Claude Code"}
            </Menu.Item>
            <Menu.Item
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-error/80 outline-none hover:bg-bg-100"
              onClick={(e) => {
                e.preventDefault();
                onDelete(sessionId);
              }}
            >
              <Trash2 className="w-4 h-4" />
              {variant === "code" ? "Delete" : "Delete session"}
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
