import type { Entry, EntryNode } from '../reference/types';

function entryText(entry: Entry): string {
  if (typeof entry === 'string') return entry;
  return (entry.entries ?? []).map(entryText).join(' ');
}

/**
 * Some race/subrace variants (Variant Human, the Eberron dragonmarked Humans, ...) grant a
 * bonus skill proficiency and/or a bonus feat alongside their ability score choice — encoded as
 * named trait blocks in the race's `entries`, not in the `ability` block `abilityBonus.ts`
 * already parses. Detected by trait name + phrasing rather than by race name, so it covers any
 * variant with this shape, not just Variant Human specifically.
 */
export function parseBonusSkillAndFeatGrant(entries: Entry[]): { grantsSkill: boolean; grantsFeat: boolean } {
  let grantsSkill = false;
  let grantsFeat = false;

  for (const entry of entries) {
    if (typeof entry === 'string') continue;
    const node = entry as EntryNode;
    const name = (node.name ?? '').toLowerCase();
    const text = entryText(node).toLowerCase();
    if (name === 'skills' && text.includes('skill of your choice')) grantsSkill = true;
    if (name === 'feat' && text.includes('feat of your choice')) grantsFeat = true;
  }

  return { grantsSkill, grantsFeat };
}
