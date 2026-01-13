import { create } from "zustand";
import type { ServerEvent, WorkTreeInfo, FileChange } from "../types";

interface WorktreeState {
  // State
  worktrees: Record<string, WorkTreeInfo>;
  activeWorktreeChanges: FileChange[];
  activeWorktreeDiff: { filePath: string; diff: string } | null;

  // Actions
  clearActiveWorktreeData: () => void;

  // Event Handling
  handleWorktreeEvent: (event: ServerEvent) => void;
}

export const useWorktreeStore = create<WorktreeState>((set, get) => ({
  worktrees: {},
  activeWorktreeChanges: [],
  activeWorktreeDiff: null,

  clearActiveWorktreeData: () => {
    set({
      activeWorktreeChanges: [],
      activeWorktreeDiff: null,
    });
  },

  handleWorktreeEvent: (event) => {
    switch (event.type) {
      case "worktree.created": {
        const worktree = event.payload.worktree;
        set((state) => ({
          worktrees: {
            ...state.worktrees,
            [worktree.id]: worktree,
          },
        }));
        break;
      }

      case "worktree.list": {
        const { worktrees } = event.payload;
        set((state) => {
          const nextWorktrees = { ...state.worktrees };
          for (const wt of worktrees) {
            nextWorktrees[wt.id] = wt;
          }
          return { worktrees: nextWorktrees };
        });
        break;
      }

      case "worktree.changes": {
        set({ activeWorktreeChanges: event.payload.changes });
        break;
      }

      case "worktree.diff": {
        set({
          activeWorktreeDiff: {
            filePath: event.payload.filePath,
            diff: event.payload.diff,
          },
        });
        break;
      }

      case "worktree.merged": {
        const { worktreeId } = event.payload;
        set((state) => {
          const existing = state.worktrees[worktreeId];
          if (!existing) return {};
          return {
            worktrees: {
              ...state.worktrees,
              [worktreeId]: { ...existing, status: "merged" },
            },
          };
        });
        break;
      }

      case "worktree.abandoned": {
        const { worktreeId } = event.payload;
        set((state) => {
          const existing = state.worktrees[worktreeId];
          if (!existing) return {};
          return {
            worktrees: {
              ...state.worktrees,
              [worktreeId]: { ...existing, status: "abandoned" },
            },
          };
        });
        break;
      }

      case "worktree.prCreated": {
        // Could store PR info in worktree state if needed
        console.log("PR created:", event.payload);
        break;
      }
    }
  },
}));
