import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ServerEvent } from "../types";

export type QualityLevel = "standard" | "high" | "max";
export type SessionMode = "normal" | "workspace";

export const AVAILABLE_MODELS = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "claude-opus-4-5-20251101", label: "Claude Opus 4.5" },
  { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
] as const;

export const QUALITY_LEVELS: { id: QualityLevel; label: string; description: string }[] = [
  { id: "standard", label: "Standard", description: "Fast responses" },
  { id: "high", label: "High", description: "Balanced" },
  { id: "max", label: "Max", description: "Best quality" },
];

interface AppState {
  // Global app state
  prompt: string;
  cwd: string;
  selectedGitHubRepoId: string | null;
  pendingStart: boolean;
  globalError: string | null;

  // Model and quality settings
  selectedModel: string;
  qualityLevel: QualityLevel;

  // Workspace context
  activeWorkspaceId: string | null;
  sessionMode: SessionMode;

  // Actions
  setPrompt: (prompt: string) => void;
  setCwd: (cwd: string) => void;
  setSelectedGitHubRepoId: (repoId: string | null) => void;
  setPendingStart: (pending: boolean) => void;
  setGlobalError: (error: string | null) => void;
  setSelectedModel: (model: string) => void;
  setQualityLevel: (level: QualityLevel) => void;
  setActiveWorkspaceId: (id: string | null) => void;
  setSessionMode: (mode: SessionMode) => void;

  // Event Handling (for global errors)
  handleAppEvent: (event: ServerEvent) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      prompt: "",
      cwd: "",
      selectedGitHubRepoId: null,
      pendingStart: false,
      globalError: null,

      // Model and quality defaults
      selectedModel: AVAILABLE_MODELS[0].id,
      qualityLevel: "high" as QualityLevel,

      // Workspace context
      activeWorkspaceId: null,
      sessionMode: "normal" as SessionMode,

      setPrompt: (prompt) => set({ prompt }),
      setCwd: (cwd) => set({ cwd }),
      setSelectedGitHubRepoId: (selectedGitHubRepoId) =>
        set({ selectedGitHubRepoId }),
      setPendingStart: (pendingStart) => set({ pendingStart }),
      setGlobalError: (globalError) => set({ globalError }),
      setSelectedModel: (selectedModel) => set({ selectedModel }),
      setQualityLevel: (qualityLevel) => set({ qualityLevel }),
      setActiveWorkspaceId: (activeWorkspaceId) => set({ activeWorkspaceId }),
      setSessionMode: (sessionMode) => set({ sessionMode }),

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
      }),
    }
  )
);
