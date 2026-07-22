import { describe, expect, it } from 'vitest';
import { applyAbilityBoosts } from './abilityBoosts';
import type { AbilityScores } from '../character/types';

const SCORES: AbilityScores = { str: 15, dex: 12, con: 13, int: 10, wis: 10, cha: 10 };
const HP = { max: 30, current: 25, temp: 0 };

describe('applyAbilityBoosts', () => {
  it('raises scores and caps at 20', () => {
    const r = applyAbilityBoosts({ ...SCORES, str: 19 }, HP, { str: 2 }, 4);
    expect(r.abilityScores.str).toBe(20);
  });

  it('retroactively raises HP by character level when the CON mod goes up', () => {
    // CON 13 -> 14: mod +1 -> +2, so +1 HP per character level (4) = +4
    const r = applyAbilityBoosts(SCORES, HP, { con: 1 }, 4);
    expect(r.hp).toEqual({ max: 34, current: 29, temp: 0 });
  });

  it('does not change HP when CON rises without a mod change', () => {
    // CON 13 -> ... boosting from 12 to 13 keeps mod at +1
    const r = applyAbilityBoosts({ ...SCORES, con: 12 }, HP, { con: 1 }, 4);
    expect(r.hp).toEqual(HP);
  });

  it('leaves inputs untouched (pure)', () => {
    const scores = { ...SCORES };
    const hp = { ...HP };
    applyAbilityBoosts(scores, hp, { con: 1, str: 2 }, 5);
    expect(scores).toEqual(SCORES);
    expect(hp).toEqual(HP);
  });
});
