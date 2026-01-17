import { useEffect, useState } from "react";

export type ToolStatus = "pending" | "success" | "error";

export const toolUseMap = new Map<string, string>();
export const toolStatusMap = new Map<string, ToolStatus>();
const toolStatusListeners = new Set<() => void>();

export const setToolStatus = (
  toolUseId: string | undefined,
  status: ToolStatus,
) => {
  if (!toolUseId) {
    return;
  }
  toolStatusMap.set(toolUseId, status);
  toolStatusListeners.forEach((listener) => listener());
};

export const useToolStatus = (toolUseId: string | undefined) => {
  const [status, setStatus] = useState<ToolStatus | undefined>(() =>
    toolUseId ? toolStatusMap.get(toolUseId) : undefined,
  );

  useEffect(() => {
    if (!toolUseId) {
      return;
    }
    const handleUpdate = () => {
      setStatus(toolStatusMap.get(toolUseId));
    };
    toolStatusListeners.add(handleUpdate);
    return () => {
      toolStatusListeners.delete(handleUpdate);
    };
  }, [toolUseId]);

  return status;
};
