import { describe, expect, it } from 'vitest';
import { characterAc, passiveScore } from './index';
import type { AbilityScores, Character } from '../character/types';

function char(scores: Partial<AbilityScores>, classNames: string[], acOverride?: number): Character {
  return {
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...scores },
    classes: classNames.map(n => ({ classRef: { name: n, source: 'PHB' }, level: 1 })),
    dashboard: { widgets: acOverride != null ? [{ type: 'combat-stats', config: { acOverride } }] : [] },
  } as unknown as Character;
}

describe('characterAc', () => {
  it('is 10 + DEX for a plain unarmored character', () => {
    expect(characterAc(char({ dex: 14 }, ['Fighter']))).toBe(12);
  });

  it('applies Barbarian Unarmored Defense (10 + DEX + CON)', () => {
    expect(characterAc(char({ dex: 14, con: 16 }, ['Barbarian']))).toBe(15);
  });

  it('applies Monk Unarmored Defense (10 + DEX + WIS)', () => {
    expect(characterAc(char({ dex: 16, wis: 14 }, ['Monk']))).toBe(15);
  });

  it('never drops below the 10 + DEX base when the ability mod is negative', () => {
    expect(characterAc(char({ dex: 16, con: 8 }, ['Barbarian']))).toBe(13);
  });

  it('takes the best Unarmored Defense across a multiclass', () => {
    expect(characterAc(char({ dex: 12, con: 18, wis: 10 }, ['Barbarian', 'Monk']))).toBe(15);
  });

  it('lets an explicit armor override win over Unarmored Defense', () => {
    expect(characterAc(char({ dex: 14, con: 16 }, ['Barbarian'], 18))).toBe(18);
  });
});

describe('passiveScore', () => {
  it('is 10 + mod when not proficient', () => {
    expect(passiveScore(3, 2, false)).toBe(13);
  });

  it('adds the proficiency bonus once when proficient', () => {
    expect(passiveScore(3, 2, true)).toBe(15);
  });

  it('doubles the proficiency bonus with expertise', () => {
    expect(passiveScore(3, 2, true, true)).toBe(17);
  });

  it('ignores expertise when not proficient', () => {
    expect(passiveScore(3, 2, false, true)).toBe(13);
  });
});
