import { Menu } from "@base-ui/react/menu";
import { ChevronDown, Gauge } from "lucide-react";
import { useAppStore, QUALITY_LEVELS, type QualityLevel } from "../store/useAppStore";

export function QualitySelector() {
  const qualityLevel = useAppStore((state) => state.qualityLevel);
  const setQualityLevel = useAppStore((state) => state.setQualityLevel);

  const currentLevel = QUALITY_LEVELS.find((q) => q.id === qualityLevel);
  const displayLabel = currentLevel?.label || "Quality";

  return (
    <Menu.Root>
      <Menu.Trigger className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-text-400 hover:text-text-200 hover:bg-bg-100 transition-colors cursor-pointer">
        <Gauge className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{displayLabel}</span>
        <ChevronDown className="w-3 h-3" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="top" align="start" sideOffset={8}>
          <Menu.Popup className="min-w-[180px] rounded-xl bg-bg-100 py-1 shadow-elevated ring-1 ring-border-100/10 z-[9999]">
            {QUALITY_LEVELS.map((level) => (
              <Menu.Item
                key={level.id}
                className={`flex flex-col px-3 py-2 cursor-pointer outline-none transition-colors ${
                  qualityLevel === level.id
                    ? "bg-accent/10"
                    : "hover:bg-bg-200"
                }`}
                onSelect={() => setQualityLevel(level.id)}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-sm font-medium ${
                      qualityLevel === level.id ? "text-accent" : "text-text-200"
                    }`}
                  >
                    {level.label}
                  </span>
                  {qualityLevel === level.id && (
                    <span className="text-accent text-sm">✓</span>
                  )}
                </div>
                <span className="text-xs text-text-400 mt-0.5">
                  {level.description}
                </span>
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
