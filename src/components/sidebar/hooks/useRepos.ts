import { useEffect, useState } from "react";
import type { SessionMode } from "../../../store/useAppStore";
import type { GithubRepo } from "../types";

export function useRepos(sessionMode: SessionMode, authenticated: boolean) {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [hasLoadedRepos, setHasLoadedRepos] = useState(false);

  useEffect(() => {
    if (
      sessionMode === "workspace" &&
      authenticated &&
      !hasLoadedRepos &&
      !loadingRepos
    ) {
      loadRepos();
    }
  }, [sessionMode, authenticated, hasLoadedRepos, loadingRepos]);

  const loadRepos = async () => {
    setLoadingRepos(true);
    try {
      const response = await fetch("/api/github/repos");
      if (response.ok) {
        const data = await response.json();
        setRepos(data.repos || []);
      }
    } catch (error) {
      console.error("Failed to load repos:", error);
    } finally {
      setLoadingRepos(false);
      setHasLoadedRepos(true);
    }
  };

  const addRepo = (repo: GithubRepo) => {
    setRepos((prev) => [...prev, repo]);
  };

  return { repos, loadingRepos, addRepo };
}
