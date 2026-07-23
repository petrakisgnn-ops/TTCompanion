import { describe, expect, it } from 'vitest';
import { maxPreparedSpells } from './spellcasting';
import { computeSpellSlots } from './spellSlots';
import { computeClassResources } from './classResources';
import { getClassData, weaponMasteryCount } from './classData';
import type { AbilityScores } from '../character/types';
import { loadClassJson, pickClassEntry } from './__fixtures__/classJson';
import { extractClassTable } from './__fixtures__/classTable';

// The XPHB casters (2024 core). Artificer isn't in XPHB, so it's out of the 2024 pass.
const CASTERS_2024 = ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'];
const CANTRIP_CASTERS_2024 = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Warlock', 'Wizard'];
const FULL_OR_HALF_2024 = ['Bard', 'Cleric', 'Druid', 'Sorcerer', 'Wizard', 'Paladin', 'Ranger'];

const SCORES: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

function trimTrailingZeros(row: number[]): number[] {
  let end = row.length;
  while (end > 0 && row[end - 1] === 0) end--;
  return row.slice(0, end);
}
const table2024 = (cls: string) => extractClassTable(pickClassEntry(loadClassJson(cls), '5.5e').classTableGroups);
const resourceMax = (cls: string, level: number, id: string) =>
  computeClassResources(cls, level, SCORES, '5.5e').find(t => t.id === id)?.max ?? 0;

describe('2024 class-table reconciliation (app 5.5e rules ↔ XPHB JSON)', () => {
  it.each(CASTERS_2024)('%s: Prepared Spells column matches maxPreparedSpells(…, 5.5e)', cls => {
    const col = table2024(cls).columns['Prepared Spells'];
    expect(col, `${cls} has a Prepared Spells column`).toBeDefined();
    for (let level = 1; level <= 20; level++) {
      expect(maxPreparedSpells(cls, level, 0, '5.5e'), `${cls} @${level}`).toBe(col[level - 1]);
    }
  });

  it.each(CANTRIP_CASTERS_2024)('%s: Cantrips column matches the cantrip table (unchanged from 2014)', cls => {
    const col = table2024(cls).columns['Cantrips'];
    const known = getClassData(cls)?.cantripsKnown;
    expect(col).toBeDefined();
    for (let level = 1; level <= 20; level++) {
      if (col[level - 1] != null) expect(known?.[level - 1], `${cls} @${level}`).toBe(col[level - 1]);
    }
  });

  it.each(FULL_OR_HALF_2024)('%s: spell slots are identical to 2014', cls => {
    const { spellSlots } = table2024(cls);
    if (!spellSlots) return;
    const type = getClassData(cls)!.spellcasting; // 'full' | 'half'
    for (let level = 1; level <= 20; level++) {
      const app = computeSpellSlots(type, level, '5.5e').filter(t => t.id.startsWith('slot-')).map(t => t.max);
      expect(app, `${cls} slots @${level}`).toEqual(trimTrailingZeros(spellSlots[level - 1]));
    }
  });

  it('Cleric Channel Divinity is 2 / 3 / 4 at levels 2 / 6 / 18', () => {
    const col = table2024('Cleric').columns['Channel Divinity'];
    for (let level = 1; level <= 20; level++) {
      expect(resourceMax('Cleric', level, 'channel-divinity'), `@${level}`).toBe(col[level - 1]);
    }
  });

  it('Paladin Channel Divinity is 2 from level 3, 3 from level 11', () => {
    const col = table2024('Paladin').columns['Channel Divinity'];
    for (let level = 1; level <= 20; level++) {
      expect(resourceMax('Paladin', level, 'channel-divinity'), `@${level}`).toBe(col[level - 1]);
    }
  });

  it.each(['Barbarian', 'Fighter'])('%s Weapon Mastery count matches the XPHB column', cls => {
    const col = table2024(cls).columns['Weapon Mastery'];
    expect(col, `${cls} has a Weapon Mastery column`).toBeDefined();
    for (let level = 1; level <= 20; level++) {
      expect(weaponMasteryCount(cls, level, '5.5e'), `${cls} @${level}`).toBe(col[level - 1]);
    }
  });

  it('gives Paladin/Ranger/Rogue a fixed 2, and none to non-martials or in 2014', () => {
    for (const cls of ['Paladin', 'Ranger', 'Rogue']) {
      expect(weaponMasteryCount(cls, 1, '5.5e')).toBe(2);
      expect(weaponMasteryCount(cls, 20, '5.5e')).toBe(2);
    }
    expect(weaponMasteryCount('Wizard', 20, '5.5e')).toBe(0);
    expect(weaponMasteryCount('Monk', 20, '5.5e')).toBe(0);
    expect(weaponMasteryCount('Fighter', 5, '5e')).toBe(0); // no weapon mastery in 2014
  });

  it('Barbarian Rage matches the 2024 Rages column and is tracked (6) at level 20', () => {
    const col = table2024('Barbarian').columns['Rages']; // (number | null)[]
    for (let level = 1; level <= 20; level++) {
      // Every 2024 Rages cell is numeric (level 20 = 6, not "Unlimited").
      expect(resourceMax('Barbarian', level, 'rage'), `@${level}`).toBe(col[level - 1]);
    }
    expect(resourceMax('Barbarian', 20, 'rage')).toBe(6);
  });
});
