import type { ReactNode } from 'react';

export type TagHandler = (
  args: string[],
  renderInline: (text: string) => ReactNode,
) => ReactNode;

const registry = new Map<string, TagHandler>();

export function registerHandler(tag: string, handler: TagHandler): void {
  registry.set(tag, handler);
}

// Dispatches a parsed tag to its registered handler.
// Falls back to the display text (args[0]) for unknown tags — never throws.
export function renderTagNode(
  tag: string,
  args: string[],
  renderInline: (text: string) => ReactNode,
): ReactNode {
  const handler = registry.get(tag);
  if (handler) return handler(args, renderInline);
  return args[0] ?? tag;
}
