import { ArrowLeft, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router";
import type { SessionMeta } from "../../store/useSessionsStore";

interface ChatTitleBarProps {
  session: SessionMeta | undefined;
  onBack?: () => void;
}

export function ChatTitleBar({ session, onBack }: ChatTitleBarProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex items-center py-2 px-4 lg:px-6">
      {/* Back button - visible on mobile */}
      <button
        className="shrink-0 mr-2 flex items-center justify-center rounded-lg p-1.5 text-text-400 hover:bg-bg-200 lg:hidden transition-colors"
        onClick={handleBack}
        aria-label="Back to sessions"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Left-aligned title with dropdown indicator */}
      <button className="flex items-center gap-1.5 min-w-0 text-text-100 hover:text-text-000 transition-colors group">
        <span className="text-base font-medium truncate">
          {session?.title || "New Chat"}
        </span>
        <ChevronDown className="w-4 h-4 shrink-0 text-text-400 group-hover:text-text-200 transition-colors" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Running indicator */}
      {session?.status === "running" && (
        <div className="shrink-0 ml-2 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
        </div>
      )}
    </div>
  );
}
