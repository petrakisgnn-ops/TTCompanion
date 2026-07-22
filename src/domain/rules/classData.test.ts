import { describe, expect, it } from 'vitest';
import { subclassLevel } from './classData';

describe('subclassLevel', () => {
  it('is level 1 for Cleric, Sorcerer, and Warlock', () => {
    expect(subclassLevel('Cleric')).toBe(1);
    expect(subclassLevel('Sorcerer')).toBe(1);
    expect(subclassLevel('Warlock')).toBe(1);
  });

  it('is level 2 for Wizard and Druid', () => {
    expect(subclassLevel('Wizard')).toBe(2);
    expect(subclassLevel('Druid')).toBe(2);
  });

  it('defaults to level 3 for every other class', () => {
    for (const cls of ['Bard', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Barbarian', 'Artificer']) {
      expect(subclassLevel(cls)).toBe(3);
    }
  });
});
