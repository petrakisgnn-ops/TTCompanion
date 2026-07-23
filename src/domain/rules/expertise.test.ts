import { describe, expect, it } from 'vitest';
import { expertiseCount } from './expertise';

describe('expertiseCount', () => {
  it('Rogue: 2 from level 1, 4 from level 6', () => {
    expect(expertiseCount('Rogue', 1)).toBe(2);
    expect(expertiseCount('Rogue', 5)).toBe(2);
    expect(expertiseCount('Rogue', 6)).toBe(4);
    expect(expertiseCount('Rogue', 20)).toBe(4);
  });

  it('Bard: none before 3, 2 from level 3, 4 from level 10', () => {
    expect(expertiseCount('Bard', 2)).toBe(0);
    expect(expertiseCount('Bard', 3)).toBe(2);
    expect(expertiseCount('Bard', 9)).toBe(2);
    expect(expertiseCount('Bard', 10)).toBe(4);
  });

  it('is 0 for every other class', () => {
    for (const cls of ['Fighter', 'Wizard', 'Cleric', 'Barbarian', 'Ranger']) {
      expect(expertiseCount(cls, 20)).toBe(0);
    }
  });
});
