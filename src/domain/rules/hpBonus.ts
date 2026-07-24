import type { Character } from '../character/types';

/**
 * Extra HP-per-level a few race/subclass traits grant (Hill Dwarf's Dwarven Toughness,
 * Sorcerer's Draconic Resilience). These are prose traits with no structured field in
 * the dump, so this is a deliberately-small hand-maintained map of the known 2014 PHB
 * cases — not derived from data. Returns bonus HP per *character* level.
 */
export function hpBonusPerLevel(character: Character): number {
  let bonus = 0;

  // Hill Dwarf — "Dwarven Toughness": +1 HP max per level. The subrace is stored as
  // "Hill" (raceName Dwarf) in this dump.
  const sub = character.subrace?.name?.toLowerCase() ?? '';
  const race = character.race.name.toLowerCase();
  if (race === 'dwarf' && (sub === 'hill' || sub === 'hill dwarf')) bonus += 1;

  // Sorcerer, Draconic Bloodline — "Draconic Resilience": +1 HP max per sorcerer level.
  // Modeled as +1 per character level (single-class assumption, consistent with the
  // rest of this app's HP handling).
  if (character.classes.some(cl =>
    cl.classRef.name === 'Sorcerer' && cl.subclass?.name === 'Draconic Bloodline',
  )) bonus += 1;

  // Tough feat — "+2 HP max per level" (taken at creation OR via ASI). Modeling it as a flat
  // +2 per character level yields exactly the RAW total (2×level when gained + 2 per level
  // thereafter always sums to 2×level), so it flows through creation and every level-up.
  if ((character.feats ?? []).some(f => f.name === 'Tough')) bonus += 2;

  return bonus;
}
