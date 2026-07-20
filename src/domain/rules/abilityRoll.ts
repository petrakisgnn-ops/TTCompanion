import { rollDice } from './dice';

export interface AbilityRollResult {
  total: number;
  dice: number[];
  dropped: number;
}

/** 4d6, drop the lowest die — the classic 5e "roll for stats" method. */
export function rollAbilityScore(): AbilityRollResult {
  const dice = rollDice(4, 6);
  const sorted = [...dice].sort((a, b) => a - b);
  const dropped = sorted[0];
  const total = sorted[1] + sorted[2] + sorted[3];
  return { total, dice, dropped };
}

export function rollAbilityScores(count = 6): AbilityRollResult[] {
  return Array.from({ length: count }, rollAbilityScore);
}
