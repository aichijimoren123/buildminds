import type { StreamMessage } from "../types";

/**
 * Represents a single edit operation on a file
 */
export interface FileEdit {
  type: "edit" | "write";
  oldString?: string;
  newString?: string;
  content?: string; // For write operations
  timestamp: number;
}

/**
 * Accumulated file content from all edits
 */
export interface FileContentResult {
  filePath: string;
  /** Original content before any edits (for first edit, this is old_string) */
  oldContent: string;
  /** Final content after all edits */
  newContent: string;
  /** All edit operations in order */
  editHistory: FileEdit[];
}

/**
 * Extract all file edit/write operations from messages
 */
export function extractAllFileEdits(
  messages: StreamMessage[],
): Map<string, FileEdit[]> {
  const fileEdits = new Map<string, FileEdit[]>();

  for (const message of messages) {
    if (message.type !== "assistant") continue;

    const content = (message as any).message?.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (block.type !== "tool_use") continue;

      const toolName = block.name;
      const input = block.input as Record<string, unknown>;
      const filePath = input.file_path as string | undefined;

      if (!filePath) continue;

      if (toolName === "Write") {
        const edits = fileEdits.get(filePath) || [];
        edits.push({
          type: "write",
          content: String(input.content || ""),
          timestamp: Date.now(),
        });
        fileEdits.set(filePath, edits);
      }

      if (toolName === "Edit") {
        const edits = fileEdits.get(filePath) || [];
        edits.push({
          type: "edit",
          oldString: String(input.old_string || ""),
          newString: String(input.new_string || ""),
          timestamp: Date.now(),
        });
        fileEdits.set(filePath, edits);
      }
    }
  }

  return fileEdits;
}

/**
 * Get file content for a specific file from messages
 * Reconstructs the old and new content from edit operations
 */
export function getFileContent(
  messages: StreamMessage[],
  filePath: string,
): FileContentResult | null {
  const allEdits = extractAllFileEdits(messages);
  const edits = allEdits.get(filePath);

  if (!edits || edits.length === 0) return null;

  // For the simplest case: single write operation
  if (edits.length === 1 && edits[0].type === "write") {
    return {
      filePath,
      oldContent: "", // New file
      newContent: edits[0].content || "",
      editHistory: edits,
    };
  }

  // For edit operations, we need to reconstruct content
  // Start with empty content and apply edits
  let currentContent = "";
  let firstOldContent = "";
  let isFirstEdit = true;

  for (const edit of edits) {
    if (edit.type === "write") {
      currentContent = edit.content || "";
    } else if (edit.type === "edit") {
      if (isFirstEdit) {
        // For the first edit, we capture what was there before
        // This is an approximation - we only have the old_string
        firstOldContent = edit.oldString || "";
        isFirstEdit = false;
      }
      // Apply the edit by replacing old_string with new_string
      if (edit.oldString && edit.newString !== undefined) {
        currentContent = currentContent.replace(
          edit.oldString,
          edit.newString,
        );
      }
    }
  }

  // If we only have edits (no initial write), try to reconstruct
  // by looking at the first edit's old_string
  if (isFirstEdit === false && firstOldContent) {
    // The old content is approximately the first edit's old_string
    // This won't be the full file, just the edited portion
    return {
      filePath,
      oldContent: firstOldContent,
      newContent: edits[edits.length - 1].newString || currentContent,
      editHistory: edits,
    };
  }

  return {
    filePath,
    oldContent: "",
    newContent: currentContent,
    editHistory: edits,
  };
}

/**
 * Get all files that were modified in the session
 */
export function getModifiedFiles(messages: StreamMessage[]): string[] {
  const allEdits = extractAllFileEdits(messages);
  return Array.from(allEdits.keys());
}

/**
 * Check if a file has any edits
 */
export function hasFileEdits(
  messages: StreamMessage[],
  filePath: string,
): boolean {
  const allEdits = extractAllFileEdits(messages);
  const edits = allEdits.get(filePath);
  return !!edits && edits.length > 0;
}
