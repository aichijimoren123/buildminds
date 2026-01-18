import { Menu } from "@base-ui/react/menu";
import { ChevronDown, FolderPlus, Settings } from "lucide-react";
import type { SessionMode } from "../../store/useAppStore";

interface User {
  username: string;
  avatarUrl?: string | null;
}

interface SidebarFooterProps {
  sessionMode: SessionMode;
  user: User | null;
  authenticated: boolean;
  onOpenSettings: () => void;
  onAddRepo: () => void;
}

export function SidebarFooter({
  sessionMode,
  user,
  authenticated,
  onOpenSettings,
  onAddRepo,
}: SidebarFooterProps) {
  if (sessionMode === "workspace") {
    return (
      <div className="border-t border-border-100/10 pt-3 mt-3">
        <div className="flex items-center justify-between">
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm text-text-300 hover:text-text-100 hover:bg-bg-200 rounded-xl transition-colors"
            onClick={onAddRepo}
          >
            <FolderPlus className="w-4 h-4" />
            Add repository
          </button>
          <button
            className="flex items-center justify-center w-8 h-8 rounded-lg text-text-400 hover:text-text-200 hover:bg-bg-200 transition-colors"
            onClick={onOpenSettings}
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (authenticated && user) {
    return (
      <div className="border-t border-border-100/10 pt-3 mt-3">
        <Menu.Root>
          <Menu.Trigger className="flex w-full items-center gap-3 rounded-xl px-3 py-2 hover:bg-bg-200 transition-colors">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-sm font-medium text-accent">
                  {user.username?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-medium text-text-100 truncate">
                {user.username}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-text-400" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner className="z-50" side="top" sideOffset={4}>
              <Menu.Popup className="min-w-[200px] rounded-xl border border-border-100/10 bg-bg-000 p-1 shadow-lg">
                <Menu.Item
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-200 outline-none hover:bg-bg-100"
                  onClick={(e) => {
                    e.preventDefault();
                    onOpenSettings();
                  }}
                >
                  <Settings className="w-4 h-4 text-text-400" />
                  Settings
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    );
  }

  return (
    <div className="border-t border-border-100/10 pt-3 mt-3">
      <button
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-text-200 hover:bg-bg-200 transition-colors"
        onClick={onOpenSettings}
      >
        <Settings className="w-4 h-4" />
        Settings
      </button>
    </div>
  );
}
