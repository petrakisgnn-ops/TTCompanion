import type { AbilityScores, ResourceTrack } from '../character/types';
import { proficiencyBonus } from './index';
import { getClassData, isAsiLevel, asiLevelsUpTo, subclassLevel } from './classData';
import { computeSpellSlots, maxHp } from './spellSlots';
import { computeClassResources } from './classResources';

/**
 * A normalized snapshot of everything the app *derives* for a single class at a given level —
 * the unit under test for the class-progression suite (see test-plan-class-progression.md).
 *
 * Phase 1 covers only values derivable from the app's pure tables (no reference-JSON parsing).
 * `optionalFeatureSlots` and `featureNames` are added in later phases once the class JSON is
 * loaded; subclass-driven spell slots (Eldritch Knight / Arcane Trickster) are likewise out of
 * this class-only snapshot for now.
 */
export interface RewardSnapshot {
  level: number;
  /** proficiencyBonus(level) — a single-class character's total level is its class level. */
  proficiencyBonus: number;
  /** maxHp(hitDie, level, 0): CON-independent so the anchor is deterministic. */
  maxHpAtConMod0: number;
  /** isAsiLevel(class, level): does THIS level grant an ASI/feat? */
  asiThisLevel: boolean;
  /** asiLevelsUpTo(class, level).length: how many ASIs earned by this level. */
  asiCountUpTo: number;
  /** level >= subclassLevel(class): has the subclass been chosen by now? */
  picksSubclassBy: boolean;
  /** Non-pact spell-slot maxes, index 0 = 1st-level slots (contiguous; empty for non-casters). */
  spellSlots: number[];
  /** Warlock Pact Magic, or null. */
  pactSlots: { count: number; level: number } | null;
  /** classData.cantripsKnown[level-1], or null for classes with no cantrip table. */
  cantripsKnown: number | null;
  /** classData.spellsKnownTable[level-1], or null for classes that don't use a known table. */
  spellsKnown: number | null;
  /** Modeled non-spell resource pools by track id, e.g. { rage: 3, ki: 5 }. */
  resources: Record<string, number>;
}

/** All-10 scores → every modifier is 0, keeping HP and most resources deterministic. */
export const DEFAULT_ABILITY_SCORES: AbilityScores = {
  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
};

/** Slot tracks arrive in order (slot-1, slot-2, …) already filtered to max > 0, and slot
 * levels are always contiguous from 1st — so their maxes in order are the slot array. */
function slotArray(tracks: ResourceTrack[]): number[] {
  return tracks.filter(t => t.id.startsWith('slot-')).map(t => t.max);
}

function pactFromTracks(tracks: ResourceTrack[]): RewardSnapshot['pactSlots'] {
  const pact = tracks.find(t => t.id === 'pact');
  if (!pact) return null;
  // Label is `Pact Magic (Nth)` — pull the slot level out of the ordinal.
  const level = Number(/\((\d+)/.exec(pact.label)?.[1] ?? 0);
  return { count: pact.max, level };
}

/**
 * Builds the reward snapshot for a single class at a level (1–20), aggregating the app's
 * pure derivation functions. `abilityScores` defaults to all-10; pass real scores only where
 * a resource depends on a modifier (Bardic Inspiration = CHA mod).
 */
export function rewardSnapshot(
  className: string,
  level: number,
  opts: { abilityScores?: AbilityScores } = {},
): RewardSnapshot {
  const data = getClassData(className);
  const scores = opts.abilityScores ?? DEFAULT_ABILITY_SCORES;
  const hitDie = data?.hitDie ?? 8;

  let spellSlots: number[] = [];
  let pactSlots: RewardSnapshot['pactSlots'] = null;
  if (data) {
    if (data.spellcasting === 'pact') {
      pactSlots = pactFromTracks(computeSpellSlots('pact', level));
    } else if (data.spellcasting !== 'none') {
      spellSlots = slotArray(computeSpellSlots(data.spellcasting, level));
    }
  }

  const resources: Record<string, number> = {};
  for (const t of computeClassResources(className, level, scores)) resources[t.id] = t.max;

  return {
    level,
    proficiencyBonus: proficiencyBonus(level),
    maxHpAtConMod0: maxHp(hitDie, level, 0),
    asiThisLevel: isAsiLevel(className, level),
    asiCountUpTo: asiLevelsUpTo(className, level).length,
    picksSubclassBy: level >= subclassLevel(className),
    spellSlots,
    pactSlots,
    cantripsKnown: data?.cantripsKnown?.[level - 1] ?? null,
    spellsKnown: data?.spellsKnownTable?.[level - 1] ?? null,
    resources,
  };
}

/** Convenience: snapshots for levels 1–20 of a class. */
export function progression(
  className: string,
  opts: { abilityScores?: AbilityScores } = {},
): RewardSnapshot[] {
  return Array.from({ length: 20 }, (_, i) => rewardSnapshot(className, i + 1, opts));
}
