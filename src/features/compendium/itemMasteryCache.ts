import type { Entry } from '../../domain/reference/types';

/** A weapon-mastery property definition (2024) — e.g. Sap, Vex, Nick, Cleave. */
export interface ItemMastery {
  name: string;
  source: string;
  entries?: Entry[];
}

let cached: Promise<Map<string, ItemMastery>> | null = null;

/**
 * The weapon-mastery definitions from items-base.json, keyed by "name|source" (lowercased) so a
 * weapon's `mastery` ref (e.g. "Sap|XPHB") resolves to what the property does. Fetched once.
 */
export function fetchItemMasteries(): Promise<Map<string, ItemMastery>> {
  if (!cached) {
    cached = (async () => {
      const res = await fetch(`${import.meta.env.BASE_URL}data/items-base.json`);
      const json: { itemMastery?: ItemMastery[] } = await res.json();
      const map = new Map<string, ItemMastery>();
      for (const m of json.itemMastery ?? []) map.set(`${m.name}|${m.source}`.toLowerCase(), m);
      return map;
    })();
  }
  return cached;
}

/** Resolves a weapon's `mastery` refs (["Sap|XPHB", …]) to their definitions. */
export async function resolveItemMasteries(refs: string[]): Promise<ItemMastery[]> {
  const map = await fetchItemMasteries();
  return refs
    .map(r => map.get(r.toLowerCase()))
    .filter((m): m is ItemMastery => m !== undefined);
}
