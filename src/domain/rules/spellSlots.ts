import type { ResourceTrack } from '../character/types';
import type { SpellcastingType } from './classData';

// Standard full-caster slot progression [level 1–20][slot level 1–9]
const FULL: readonly number[][] = [
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

// Half-caster (Paladin, Ranger) — no slots at level 1
const HALF: readonly number[][] = [
  [0, 0, 0, 0, 0],
  [2, 0, 0, 0, 0],
  [3, 0, 0, 0, 0],
  [3, 0, 0, 0, 0],
  [4, 2, 0, 0, 0],
  [4, 2, 0, 0, 0],
  [4, 3, 0, 0, 0],
  [4, 3, 0, 0, 0],
  [4, 3, 2, 0, 0],
  [4, 3, 2, 0, 0],
  [4, 3, 3, 0, 0],
  [4, 3, 3, 0, 0],
  [4, 3, 3, 1, 0],
  [4, 3, 3, 1, 0],
  [4, 3, 3, 2, 0],
  [4, 3, 3, 2, 0],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2],
];

// Artificer — half-caster but rounds up (starts at level 1)
const ARTIFICER: readonly number[][] = [
  [2, 0, 0, 0, 0],
  [2, 0, 0, 0, 0],
  [3, 0, 0, 0, 0],
  [3, 0, 0, 0, 0],
  [4, 2, 0, 0, 0],
  [4, 2, 0, 0, 0],
  [4, 3, 0, 0, 0],
  [4, 3, 0, 0, 0],
  [4, 3, 2, 0, 0],
  [4, 3, 2, 0, 0],
  [4, 3, 3, 0, 0],
  [4, 3, 3, 0, 0],
  [4, 3, 3, 1, 0],
  [4, 3, 3, 1, 0],
  [4, 3, 3, 2, 0],
  [4, 3, 3, 2, 0],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2],
];

// Third-caster subclasses (Eldritch Knight, Arcane Trickster) — no slots before
// class level 3, caps at 4th-level slots (PHB subclass tables)
const THIRD: readonly number[][] = [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [2, 0, 0, 0],
  [3, 0, 0, 0],
  [3, 0, 0, 0],
  [3, 0, 0, 0],
  [4, 2, 0, 0],
  [4, 2, 0, 0],
  [4, 2, 0, 0],
  [4, 3, 0, 0],
  [4, 3, 0, 0],
  [4, 3, 0, 0],
  [4, 3, 2, 0],
  [4, 3, 2, 0],
  [4, 3, 2, 0],
  [4, 3, 3, 0],
  [4, 3, 3, 0],
  [4, 3, 3, 0],
  [4, 3, 3, 1],
  [4, 3, 3, 1],
];

// Warlock pact slot count [level 1–20]
const PACT_COUNT = [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4];
// Warlock pact slot level [level 1–20]
const PACT_LEVEL = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th'];

function slotsToTracks(slots: readonly number[]): ResourceTrack[] {
  return slots
    .map((max, i) => ({
      id: `slot-${i + 1}`,
      label: `${ORDINALS[i]} level`,
      current: max,
      max,
      resetOn: 'longRest' as const,
    }))
    .filter(t => t.max > 0);
}

export function computeSpellSlots(
  type: SpellcastingType | '1/3',
  level: number,
): ResourceTrack[] {
  const idx = Math.min(Math.max(level, 1), 20) - 1;
  switch (type) {
    case 'full':       return slotsToTracks(FULL[idx] ?? []);
    case 'half':       return slotsToTracks(HALF[idx] ?? []);
    case 'artificer':  return slotsToTracks(ARTIFICER[idx] ?? []);
    case '1/3':        return slotsToTracks(THIRD[idx] ?? []);
    case 'pact': {
      const max = PACT_COUNT[idx] ?? 0;
      const slotLevel = PACT_LEVEL[idx] ?? 1;
      return max > 0
        ? [{ id: 'pact', label: `Pact Magic (${ORDINALS[slotLevel - 1]})`, current: max, max, resetOn: 'shortRest' }]
        : [];
    }
    default: return [];
  }
}

/** The effective slot progression of one class, counting a caster subclass (Eldritch Knight / Arcane Trickster) on an otherwise non-casting class. */
export type EffectiveCasting = SpellcastingType | '1/3';

export interface SlotContributor {
  classRef: { name: string };
  level: number;
  spellcasting: EffectiveCasting;
}

/**
 * Multiclass spell slots (PHB p.164) are NOT the sum of each class's own table — every
 * spellcasting class contributes a "caster level" to one shared full-caster table: full
 * casters count their level in full, half-casters (Paladin/Ranger) count `floor(level/2)`,
 * third-casters (Eldritch Knight / Arcane Trickster) count `floor(level/3)`, Artificer
 * counts `ceil(level/2)` (Tasha's errata — rounds the opposite way from the other
 * half-casters), Warlock's Pact Magic and non-casters contribute nothing (Pact Magic is
 * always tracked separately, never folded into this pool).
 *
 * IMPORTANT: this multiclass pooling only applies with 2+ slot-contributing classes —
 * a single-class caster uses their own class table, which rounds more generously for
 * half/third casters (Paladin 5 has 4×1st+2×2nd; the pool math would give only 3×1st).
 * Callers with one caster class should use `computeSpellSlots` directly — see
 * `resources.ts`.
 */
export function computeMulticlassSpellSlots(classes: SlotContributor[]): ResourceTrack[] {
  let combined = 0;
  for (const cl of classes) {
    switch (cl.spellcasting) {
      case 'full': combined += cl.level; break;
      case 'half': combined += Math.floor(cl.level / 2); break;
      case '1/3': combined += Math.floor(cl.level / 3); break;
      case 'artificer': combined += Math.ceil(cl.level / 2); break;
      // 'pact' and 'none' contribute 0
    }
  }
  return combined > 0 ? computeSpellSlots('full', Math.min(20, combined)) : [];
}

export function maxHp(hitDie: number, level: number, conMod: number): number {
  const lvl1 = hitDie + conMod;
  const perLevel = Math.floor(hitDie / 2) + 1 + conMod;
  return Math.max(1, lvl1 + Math.max(0, level - 1) * perLevel);
}
