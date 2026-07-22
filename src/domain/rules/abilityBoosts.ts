import type { AbilityScores } from '../character/types';
import { abilityMod } from './index';

export interface BoostResult {
  abilityScores: AbilityScores;
  hp: { max: number; current: number; temp: number };
}

/**
 * Applies ability score increases (from an ASI or a half-feat), capping each score at
 * 20, and retroactively raises max/current HP when the CON modifier goes up — +1 HP
 * per *character* level per point of CON mod gained (PHB p.173: hit point maximum is
 * retroactively recalculated). Pure: returns new objects, inputs untouched.
 */
export function applyAbilityBoosts(
  scores: AbilityScores,
  hp: { max: number; current: number; temp: number },
  boosts: Partial<AbilityScores>,
  characterLevel: number,
): BoostResult {
  const next: AbilityScores = {
    str: Math.min(20, scores.str + (boosts.str ?? 0)),
    dex: Math.min(20, scores.dex + (boosts.dex ?? 0)),
    con: Math.min(20, scores.con + (boosts.con ?? 0)),
    int: Math.min(20, scores.int + (boosts.int ?? 0)),
    wis: Math.min(20, scores.wis + (boosts.wis ?? 0)),
    cha: Math.min(20, scores.cha + (boosts.cha ?? 0)),
  };

  const conModDelta = abilityMod(next.con) - abilityMod(scores.con);
  if (conModDelta <= 0) return { abilityScores: next, hp: { ...hp } };

  const gained = conModDelta * characterLevel;
  return {
    abilityScores: next,
    hp: { ...hp, max: hp.max + gained, current: hp.current + gained },
  };
}
