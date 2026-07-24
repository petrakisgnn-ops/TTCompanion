import type { RefId } from '../../domain/reference/types';

/**
 * Display name for a subclass option. When two options in the same list share a display name
 * (the dump lists the same subclass from several sources — PHB, XGE, third-party, …), the bare
 * name is ambiguous, so append the source in parentheses. Unique names stay clean.
 */
export function subclassLabel(sub: RefId, all: RefId[]): string {
  const duplicated = all.filter(s => s.name === sub.name).length > 1;
  return duplicated ? `${sub.name} (${sub.source})` : sub.name;
}
