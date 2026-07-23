import { describe, expect, it } from 'vitest';
import { armorClass, parseItemArmor } from './ac';
import type { AbilityScores, Character } from '../character/types';

function char(scores: Partial<AbilityScores>, classNames: string[], acOverride?: number): Character {
  return {
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...scores },
    classes: classNames.map(n => ({ classRef: { name: n, source: 'PHB' }, level: 1 })),
    dashboard: { widgets: acOverride != null ? [{ type: 'combat-stats', config: { acOverride } }] : [] },
  } as unknown as Character;
}

describe('parseItemArmor', () => {
  it('reads each armor kind with its default DEX cap', () => {
    expect(parseItemArmor({ type: 'LA', ac: 11 })).toEqual({ kind: 'light', ac: 11, dexCap: undefined });
    expect(parseItemArmor({ type: 'MA', ac: 14 })).toEqual({ kind: 'medium', ac: 14, dexCap: 2 });
    expect(parseItemArmor({ type: 'HA', ac: 18 })).toEqual({ kind: 'heavy', ac: 18, dexCap: 0 });
    expect(parseItemArmor({ type: 'S', ac: 2 })).toEqual({ kind: 'shield', ac: 2 });
  });

  it('honors an explicit dexterityMax and a source-suffixed type code', () => {
    expect(parseItemArmor({ type: 'MA|XPHB', ac: 15, dexterityMax: 2 })).toEqual({ kind: 'medium', ac: 15, dexCap: 2 });
  });

  it('returns null for non-armor items', () => {
    expect(parseItemArmor({ type: 'M' })).toBeNull();
    expect(parseItemArmor({})).toBeNull();
  });
});

describe('armorClass', () => {
  it('light armor adds full DEX', () => {
    expect(armorClass(char({ dex: 14 }, ['Fighter']), { kind: 'light', ac: 11 })).toBe(13);
  });

  it('medium armor caps the DEX contribution at 2', () => {
    expect(armorClass(char({ dex: 18 }, ['Fighter']), { kind: 'medium', ac: 14, dexCap: 2 })).toBe(16);
  });

  it('heavy armor ignores DEX', () => {
    expect(armorClass(char({ dex: 18 }, ['Fighter']), { kind: 'heavy', ac: 18, dexCap: 0 })).toBe(18);
  });

  it('adds a shield on top of worn armor and of unarmored', () => {
    expect(armorClass(char({ dex: 14 }, ['Fighter']), { kind: 'light', ac: 11 }, { kind: 'shield', ac: 2 })).toBe(15);
    expect(armorClass(char({ dex: 14 }, ['Fighter']), null, { kind: 'shield', ac: 2 })).toBe(14);
  });

  it('Barbarian Unarmored Defense stacks with a shield', () => {
    expect(armorClass(char({ dex: 14, con: 16 }, ['Barbarian']), null, { kind: 'shield', ac: 2 })).toBe(17);
  });

  it('Monk loses Unarmored Defense while using a shield', () => {
    const monk = char({ dex: 14, wis: 16 }, ['Monk']);
    expect(armorClass(monk, null, null)).toBe(15);        // 10 + 2 + 3
    expect(armorClass(monk, null, { kind: 'shield', ac: 2 })).toBe(14); // 10 + 2 base, + 2 shield, no WIS
  });

  it('an armor override wins over resolved armor', () => {
    expect(armorClass(char({ dex: 14 }, ['Fighter'], 20), { kind: 'heavy', ac: 18, dexCap: 0 })).toBe(20);
  });
});
