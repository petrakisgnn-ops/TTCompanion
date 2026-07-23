import { describe, expect, it } from 'vitest';
import { subclassLevel, asiLevelsUpTo } from './classData';

describe('asiLevelsUpTo', () => {
  it('returns no ASI levels below level 4', () => {
    expect(asiLevelsUpTo('Wizard', 3)).toEqual([]);
  });

  it('uses the default 4/8/12/16/19 progression for most classes', () => {
    expect(asiLevelsUpTo('Wizard', 10)).toEqual([4, 8]);
    expect(asiLevelsUpTo('Cleric', 20)).toEqual([4, 8, 12, 16, 19]);
  });

  it('gives Fighter its extra ASIs at 6 and 14', () => {
    expect(asiLevelsUpTo('Fighter', 10)).toEqual([4, 6, 8]);
  });

  it('gives Rogue its extra ASI at 10', () => {
    expect(asiLevelsUpTo('Rogue', 10)).toEqual([4, 8, 10]);
  });
});

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
