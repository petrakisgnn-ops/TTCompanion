import { describe, expect, it } from 'vitest';
import { startingHp } from './startingHp';

const cleric6 = { hitDie: 8, level: 6, conMod: 2 };

describe('startingHp', () => {
  it('average: full die at level 1, then die/2+1 + CON per level', () => {
    expect(startingHp(cleric6, { kind: 'average' })).toBe(10 + 5 * 7); // 45
  });
  it('rolled: uses each roll + CON, minimum 1 per level', () => {
    expect(startingHp(cleric6, { kind: 'rolled', rolls: [8, 1, 4, 6, 3] })).toBe(10 + 10 + 3 + 6 + 8 + 5);
    expect(startingHp({ hitDie: 6, level: 2, conMod: -3 }, { kind: 'rolled', rolls: [1] })).toBe(3 + 1); // d6-3 at L1, min 1 at L2
  });
  it('adds per-level bonuses (Tough) to average and rolled', () => {
    expect(startingHp({ ...cleric6, bonusPerLevel: 2 }, { kind: 'average' })).toBe(45 + 12);
  });
  it('manual is the final total as entered', () => {
    expect(startingHp({ ...cleric6, bonusPerLevel: 2 }, { kind: 'manual', total: 52 })).toBe(52);
    expect(startingHp(cleric6, { kind: 'manual', total: 0 })).toBe(1);
  });
});
