import type { Entry, EntryNode } from './types';

export interface FeatureEntry {
  title: string;
  entries: Entry[];
}

function isNamedNode(e: Entry): e is EntryNode & { name: string } {
  return typeof e === 'object' && typeof e.name === 'string' && e.name.length > 0;
}

/**
 * Splits a race/background `entries` array into individually-titled features.
 * These arrays are usually a flat list of named sub-entries (e.g. Half-Elf's
 * "Darkvision", "Fey Ancestry", "Skill Versatility" ...); a few (mostly
 * backgrounds) lead with an unnamed entry — typically the proficiency/equipment
 * summary list — which gets grouped under `fallbackTitle` so nothing is dropped.
 */
export function extractFeatures(entries: Entry[], fallbackTitle: string): FeatureEntry[] {
  const named: FeatureEntry[] = [];
  const unnamed: Entry[] = [];

  for (const e of entries) {
    if (isNamedNode(e)) {
      named.push({ title: e.name, entries: e.entries ?? [e] });
    } else {
      unnamed.push(e);
    }
  }

  return unnamed.length > 0
    ? [{ title: fallbackTitle, entries: unnamed }, ...named]
    : named;
}
