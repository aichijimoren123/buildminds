import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ServerEvent } from "../types";

export type QualityLevel = "standard" | "high" | "max";
export type SessionMode = "normal" | "workspace";
export type ThemeMode = "light" | "dark" | "system";

export const AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "claude-opus-4-5-20251101", label: "Claude Opus 4.5" },
  { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
] as const;

export const QUALITY_LEVELS: {
  id: QualityLevel;
  label: string;
  description: string;
}[] = [
  { id: "standard", label: "Standard", description: "Fast responses" },
  { id: "high", label: "High", description: "Balanced" },
  { id: "max", label: "Max", description: "Best quality" },
];

interface AppState {
  // Global app state
  prompt: string;
  cwd: string;
  defaultCwd: string; // Default CWD from server settings
  pendingStart: boolean;
  globalError: string | null;
  serverSettingsLoaded: boolean;

  // Model and quality settings
  selectedModel: string;
  qualityLevel: QualityLevel;

  // Workspace context (workspace = GitHub repo)
  activeWorkspaceId: string | null;
  sessionMode: SessionMode;

  // Theme
  themeMode: ThemeMode;

  // Actions
  setPrompt: (prompt: string) => void;
  setCwd: (cwd: string) => void;
  setDefaultCwd: (cwd: string) => void;
  setPendingStart: (pending: boolean) => void;
  setGlobalError: (error: string | null) => void;
  setSelectedModel: (model: string) => void;
  setQualityLevel: (level: QualityLevel) => void;
  setActiveWorkspaceId: (id: string | null) => void;
  setSessionMode: (mode: SessionMode) => void;
  setThemeMode: (mode: ThemeMode) => void;
  loadServerSettings: () => Promise<void>;
  initializeTheme: () => void;

  // Event Handling (for global errors)
  handleAppEvent: (event: ServerEvent) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      prompt: "",
      cwd: "",
      defaultCwd: "",
      pendingStart: false,
      globalError: null,
      serverSettingsLoaded: false,

      // Model and quality defaults
      selectedModel: AVAILABLE_MODELS[0].id,
      qualityLevel: "high" as QualityLevel,

      // Workspace context
      activeWorkspaceId: null,
      sessionMode: "normal" as SessionMode,

      // Theme
      themeMode: "system" as ThemeMode,

      setPrompt: (prompt) => set({ prompt }),
      setCwd: (cwd) => set({ cwd }),
      setDefaultCwd: (defaultCwd) => set({ defaultCwd }),
      setPendingStart: (pendingStart) => set({ pendingStart }),
      setGlobalError: (globalError) => set({ globalError }),
      setSelectedModel: (selectedModel) => set({ selectedModel }),
      setQualityLevel: (qualityLevel) => set({ qualityLevel }),
      setActiveWorkspaceId: (activeWorkspaceId) => set({ activeWorkspaceId }),
      setSessionMode: (sessionMode) => set({ sessionMode }),

      setThemeMode: (themeMode) => {
        set({ themeMode });
        // Apply theme to document
        const applyTheme = (mode: "light" | "dark") => {
          document.documentElement.setAttribute("data-mode", mode);
        };

        if (themeMode === "system") {
          const isDark = window.matchMedia(
            "(prefers-color-scheme: dark)",
          ).matches;
          applyTheme(isDark ? "dark" : "light");
        } else {
          applyTheme(themeMode);
        }
      },

      initializeTheme: () => {
        const { themeMode } = get();
        const applyTheme = (mode: "light" | "dark") => {
          document.documentElement.setAttribute("data-mode", mode);
        };

        if (themeMode === "system") {
          const isDark = window.matchMedia(
            "(prefers-color-scheme: dark)",
          ).matches;
          applyTheme(isDark ? "dark" : "light");

          // Listen for system theme changes
          window
            .matchMedia("(prefers-color-scheme: dark)")
            .addEventListener("change", (e) => {
              if (get().themeMode === "system") {
                applyTheme(e.matches ? "dark" : "light");
              }
            });
        } else {
          applyTheme(themeMode);
        }
      },

      loadServerSettings: async () => {
        try {
          const response = await fetch("/api/settings");
          if (response.ok) {
            const data = await response.json();
            const defaultCwd = data.settings?.DEFAULT_CWD || "";
            set({ defaultCwd, serverSettingsLoaded: true });
            // If cwd is empty, use defaultCwd
            if (!get().cwd && defaultCwd) {
              set({ cwd: defaultCwd });
            }
          }
        } catch (error) {
          console.error("Failed to load server settings:", error);
          set({ serverSettingsLoaded: true });
        }
      },

      handleAppEvent: (event) => {
        switch (event.type) {
          case "runner.error": {
            set({ globalError: event.payload.message, pendingStart: false });
            break;
          }
          case "session.status": {
            // Reset pendingStart when session starts running
            if (event.payload.status === "running") {
              set({ pendingStart: false });
            }
            break;
          }
        }
      },
    }),
    {
      name: "cc-webui:app-settings",
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        qualityLevel: state.qualityLevel,
        activeWorkspaceId: state.activeWorkspaceId,
        sessionMode: state.sessionMode,
        themeMode: state.themeMode,
      }),
    },
  ),
);
