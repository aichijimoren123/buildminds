export function isMarkdown(text: string): boolean {
  if (!text || typeof text !== "string") return false;

  const patterns: RegExp[] = [
    /^#{1,6}\s+/m, // 标题
    /```[\s\S]*?```/, // 代码块
  ];

  return patterns.some((pattern) => pattern.test(text));
}

export function hasProp(
  obj: unknown,
  key: PropertyKey,
): obj is Record<PropertyKey, unknown> {
  return typeof obj === "object" && obj !== null && key in obj;
}

export function extractTagContent(input: string, tag: string): string | null {
  const match = input.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? match[1] : null;
}

export function getMessageText(contentBlock: Record<string, unknown>): string {
  if (typeof contentBlock.text === "string") return contentBlock.text;
  if (typeof contentBlock.content === "string") return contentBlock.content;
  return JSON.stringify(contentBlock, null, 2);
}
