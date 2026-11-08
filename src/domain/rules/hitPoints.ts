/**
 * Max-HP adjustments. A character's `hp.max` is its permanent maximum (creation + level-ups);
 * `hp.maxModifier` is a temporary change on top — Aid (+5 per slot level above 1st), a curse or
 * a wight's Life Drain (negative), Heroes' Feast, … — kept separate so a level-up never bakes
 * a temporary effect into the permanent number. Pure functions.
 */
export interface HitPointsState {
  max: number;
  current: number;
  temp: number;
  /** Temporary change to the maximum (+ Aid, − curse / Life Drain). 0 when absent. */
  maxModifier?: number;
  /** Where the temporary change comes from, e.g. "Aid (3rd level)" or "Curse of the hag". */
  maxModifierNote?: string;
}

/** The maximum HP right now: permanent max + temporary modifier, never below 1. */
export function effectiveMaxHp(hp: HitPointsState): number {
  return Math.max(1, hp.max + (hp.maxModifier ?? 0));
}

/** Keeps current HP within [0, effective max]. */
function clampCurrent<T extends HitPointsState>(hp: T): T {
  return { ...hp, current: Math.max(0, Math.min(effectiveMaxHp(hp), hp.current)) };
}

/**
 * Sets the temporary max-HP modifier. Raising the maximum raises current HP by the same amount
 * (Aid: "each target's hit point maximum and current hit points increase"); lowering it only
 * caps current HP at the new maximum.
 */
export function withMaxModifier<T extends HitPointsState>(hp: T, modifier: number, note?: string): T {
  const delta = effectiveMaxHp({ ...hp, maxModifier: modifier }) - effectiveMaxHp(hp);
  // Clearing the change clears its note; otherwise keep the old note unless a new one is given.
  const maxModifierNote = modifier === 0 ? undefined : (note ?? hp.maxModifierNote);
  return clampCurrent({ ...hp, maxModifier: modifier, maxModifierNote, current: hp.current + Math.max(0, delta) });
}

/** Sets (or, when blank, removes) the note explaining the temporary change. */
export function withMaxModifierNote<T extends HitPointsState>(hp: T, note: string): T {
  const trimmed = note.trim();
  return { ...hp, maxModifierNote: trimmed ? trimmed : undefined };
}

/** Corrects the permanent maximum (house rules, a mistake at creation). Current HP moves with it. */
export function withBaseMax<T extends HitPointsState>(hp: T, max: number): T {
  const base = Math.max(1, Math.round(max));
  return clampCurrent({ ...hp, max: base, current: hp.current + (base - hp.max) });
}
