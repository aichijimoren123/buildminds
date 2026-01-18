import { Code2, Home, MessageSquare, Plus } from "lucide-react";
import type { SessionMode } from "../../store/useAppStore";

interface SidebarHeaderProps {
  sessionMode: SessionMode;
  onModeChange: (mode: SessionMode) => void;
  onNewSession: () => void;
  onNavigateHome: () => void;
}

export function SidebarHeader({
  sessionMode,
  onModeChange,
  onNewSession,
  onNavigateHome,
}: SidebarHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      {/* Home button */}
      <button
        className="flex items-center justify-center w-8 h-8 rounded-lg text-text-300 hover:text-text-100 hover:bg-bg-200 transition-colors"
        onClick={onNavigateHome}
        aria-label="Home"
        title="Home"
      >
        <Home className="w-4 h-4" />
      </button>

      {/* Mode Toggle Buttons */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-bg-000 border border-border-100/10">
        <button
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
            sessionMode === "normal"
              ? "bg-bg-200 text-text-100"
              : "text-text-400 hover:text-text-200"
          }`}
          onClick={() => onModeChange("normal")}
          aria-label="Normal mode"
          title="Normal mode"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
        <button
          className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
            sessionMode === "workspace"
              ? "bg-bg-200 text-text-100"
              : "text-text-400 hover:text-text-200"
          }`}
          onClick={() => onModeChange("workspace")}
          aria-label="Code mode"
          title="Code mode"
        >
          <Code2 className="w-4 h-4" />
        </button>
      </div>

      {/* New Session Button */}
      <button
        className="flex items-center justify-center w-8 h-8 rounded-full bg-accent text-white hover:bg-accent/90 transition-colors"
        onClick={onNewSession}
        aria-label="New session"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
