import { describe, expect, it } from 'vitest';
import { hpBonusPerLevel } from './hpBonus';
import type { Character } from '../character/types';

function char(partial: Partial<Character>): Character {
  return {
    id: 'x', name: 'x', edition: '5e', classes: [], race: { name: 'Human', source: 'PHB' }, subrace: null,
    background: { name: 'Acolyte', source: 'PHB' }, alignment: null,
    personality: { trait: '', ideal: '', bond: '', flaw: '' },
    appearance: { age: '', height: '', weight: '', eyes: '', skin: '', hair: '' },
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    hp: { max: 1, current: 1, temp: 0 }, hitDiceSpent: 0, deathSaves: { successes: 0, failures: 0 },
    concentration: null, conditions: [], proficiencies: { skills: [], saves: [], weapons: [], armor: [], tools: [], languages: [], expertise: [] },
    knownSpells: [], preparedSpells: [], optionalFeatures: [], masteredWeapons: [], inventory: [], feats: [], resources: [],
    currency: { pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 }, dashboard: { widgets: [] }, notes: '',
    ...partial,
  };
}

describe('hpBonusPerLevel', () => {
  it('gives Hill Dwarf +1 per level', () => {
    expect(hpBonusPerLevel(char({ race: { name: 'Dwarf', source: 'PHB' }, subrace: { name: 'Hill', source: 'PHB' } }))).toBe(1);
  });

  it('gives Draconic Bloodline Sorcerer +1 per level', () => {
    expect(hpBonusPerLevel(char({ classes: [{ classRef: { name: 'Sorcerer', source: 'PHB' }, level: 3, subclass: { name: 'Draconic Bloodline', source: 'PHB' } }] }))).toBe(1);
  });

  it('gives the Tough feat +2 per level', () => {
    expect(hpBonusPerLevel(char({ feats: [{ name: 'Tough', source: 'PHB' }] }))).toBe(2);
  });

  it('stacks Tough with a per-level racial bonus', () => {
    expect(hpBonusPerLevel(char({
      race: { name: 'Dwarf', source: 'PHB' }, subrace: { name: 'Hill', source: 'PHB' },
      feats: [{ name: 'Tough', source: 'XPHB' }],
    }))).toBe(3);
  });

  it('is 0 for an ordinary character', () => {
    expect(hpBonusPerLevel(char({ race: { name: 'Human', source: 'PHB' } }))).toBe(0);
    expect(hpBonusPerLevel(char({ race: { name: 'Dwarf', source: 'PHB' }, subrace: { name: 'Mountain', source: 'PHB' } }))).toBe(0);
  });
});
