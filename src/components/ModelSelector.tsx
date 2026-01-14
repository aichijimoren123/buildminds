import { Menu } from "@base-ui/react/menu";
import { ChevronDown, Sparkles } from "lucide-react";
import { useAppStore, AVAILABLE_MODELS } from "../store/useAppStore";

export function ModelSelector() {
  const selectedModel = useAppStore((state) => state.selectedModel);
  const setSelectedModel = useAppStore((state) => state.setSelectedModel);

  const currentModel = AVAILABLE_MODELS.find((m) => m.id === selectedModel);
  const displayLabel = currentModel?.label || "Select Model";

  return (
    <Menu.Root>
      <Menu.Trigger className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-text-400 hover:text-text-200 hover:bg-bg-100 transition-colors cursor-pointer">
        <Sparkles className="w-3.5 h-3.5" />
        <span className="text-xs font-medium">{displayLabel}</span>
        <ChevronDown className="w-3 h-3" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="top" align="start" sideOffset={8}>
          <Menu.Popup className="min-w-[200px] rounded-xl bg-bg-100 py-1 shadow-elevated ring-1 ring-border-100/10 z-[9999]">
            {AVAILABLE_MODELS.map((model) => (
              <Menu.Item
                key={model.id}
                className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer outline-none transition-colors ${
                  selectedModel === model.id
                    ? "bg-accent/10 text-accent"
                    : "text-text-200 hover:bg-bg-200"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  setSelectedModel(model.id);
                }}
              >
                <span className="font-medium">{model.label}</span>
                {selectedModel === model.id && (
                  <span className="text-accent">✓</span>
                )}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
