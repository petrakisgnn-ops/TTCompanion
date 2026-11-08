import type { Item } from './types';
import { matchesEdition, type Edition } from '../rules/edition';

/** A plain, non-magic item (no rarity) — what starting-equipment and mastery pickers should offer. */
export function isMundane(item: Pick<Item, 'rarity'>): boolean {
  return (item.rarity ?? 'none').toLowerCase() === 'none';
}

function matchRank(name: string, q: string): number {
  if (name === q) return 0;
  if (name.startsWith(q)) return 1;
  if (name.split(/[\s(,-]+/).some(w => w.startsWith(q))) return 2;
  return name.includes(q) ? 3 : -1;
}

export interface ItemSearchOptions {
  /** Hide items that don't belong to this edition (see matchesEdition). */
  edition?: Edition;
  limit?: number;
}

/**
 * Name search ranked so the item you typed comes first: exact name, then names starting with
 * the query, then a word starting with it, then any substring — mundane items before magic
 * ones within each tier. Without this, "plate armor" was buried under "+1 Plate Armor",
 * "Adamantine Plate Armor", … and cut off by the result limit.
 */
export function searchItems<T extends Item>(items: T[], query: string, opts: ItemSearchOptions = {}): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: { item: T; rank: number }[] = [];
  for (const item of items) {
    if (opts.edition && !matchesEdition(item.source, item.reprintedAs, opts.edition)) continue;
    const rank = matchRank(item.name.toLowerCase(), q);
    if (rank >= 0) scored.push({ item, rank });
  }
  scored.sort((a, b) =>
    a.rank - b.rank ||
    Number(!isMundane(a.item)) - Number(!isMundane(b.item)) ||
    a.item.name.localeCompare(b.item.name));
  const out = scored.map(s => s.item);
  return opts.limit ? out.slice(0, opts.limit) : out;
}
