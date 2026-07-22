import type { RefId } from '../reference/types';

/** Shape of public/data/spells/sources.json: book -> spell name -> classes that can cast it. */
export type SpellSourcesJson = Record<string, Record<string, {
  class?: { name: string; source: string }[];
  classVariant?: { name: string; source: string; definedInSource?: string }[];
}>>;

/**
 * Every spell on a class's spell list, derived from sources.json. Only the base
 * `class` grants count — `classVariant` entries are optional-rule expansions (e.g.
 * a Tasha's optional class list addition) and are intentionally excluded so the
 * default browser reflects the class's RAW spell list.
 */
export function resolveClassSpellList(sourcesJson: SpellSourcesJson, className: string): RefId[] {
  const target = className.toLowerCase();
  const refs: RefId[] = [];
  for (const [book, spells] of Object.entries(sourcesJson)) {
    for (const [spellName, entry] of Object.entries(spells)) {
      if (entry.class?.some(c => c.name.toLowerCase() === target)) {
        refs.push({ name: spellName, source: book });
      }
    }
  }
  return refs;
}
