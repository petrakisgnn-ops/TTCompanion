/**
 * Max HP for a character created above level 1. Level 1 is always the full hit die; each later
 * level adds either the fixed average (die/2 + 1) or a rolled die — plus the CON modifier, at
 * least 1 per level. `bonusPerLevel` covers Tough / Hill Dwarf / Draconic Resilience. A manual
 * value is the player's own final total (taken as-is, nothing added).
 */
export type StartingHpMethod =
  | { kind: 'average' }
  | { kind: 'rolled'; rolls: number[] }
  | { kind: 'manual'; total: number };

export interface StartingHpInput {
  hitDie: number;
  level: number;
  conMod: number;
  bonusPerLevel?: number;
}

export function startingHp({ hitDie, level, conMod, bonusPerLevel = 0 }: StartingHpInput, method: StartingHpMethod): number {
  if (method.kind === 'manual') return Math.max(1, Math.round(method.total));
  const lvl = Math.max(1, level);
  let total = Math.max(1, hitDie + conMod);
  for (let i = 0; i < lvl - 1; i++) {
    const die = method.kind === 'rolled'
      ? Math.min(hitDie, Math.max(1, method.rolls[i] ?? Math.floor(hitDie / 2) + 1))
      : Math.floor(hitDie / 2) + 1;
    total += Math.max(1, die + conMod);
  }
  return total + bonusPerLevel * lvl;
}
