import { describe, expect, it } from 'vitest';
import { mysticArcanumOptions } from './mysticArcanum';

describe('mysticArcanumOptions', () => {
  it('is empty below level 11', () => {
    expect(mysticArcanumOptions(10)).toEqual([]);
  });

  it('unlocks the 6th-level arcanum at level 11', () => {
    const options = mysticArcanumOptions(11);
    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      kind: 'choice', count: 1, dailyUses: 1, resetOn: 'longRest',
      query: { levels: [6], classFilter: ['Warlock'] },
    });
  });

  it('accumulates thresholds up to level 17', () => {
    const options = mysticArcanumOptions(17);
    expect(options.map(o => (o.kind === 'choice' ? o.query.levels[0] : null))).toEqual([6, 7, 8, 9]);
  });
});
