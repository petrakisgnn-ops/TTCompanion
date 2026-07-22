import { describe, expect, it } from 'vitest';
import { optionalFeatureSlots } from './optionalFeatures';

describe('optionalFeatureSlots', () => {
  it('reads an array progression (Warlock invocations)', () => {
    const rows = [{ name: 'Eldritch Invocations', featureType: ['EI'], progression: [0, 2, 2, 2, 3, 3] }];
    expect(optionalFeatureSlots(rows, undefined, 1)).toEqual([]);
    expect(optionalFeatureSlots(rows, undefined, 2)).toEqual([{ name: 'Eldritch Invocations', featureTypes: ['EI'], max: 2 }]);
    expect(optionalFeatureSlots(rows, undefined, 5)).toEqual([{ name: 'Eldritch Invocations', featureTypes: ['EI'], max: 3 }]);
  });

  it('reads a sparse map progression (Battle Master maneuvers on the subclass)', () => {
    const sub = [{ name: 'Maneuvers', featureType: ['MV:B'], progression: { 3: 3, 7: 5, 10: 7, 15: 9 } }];
    expect(optionalFeatureSlots(undefined, sub, 2)).toEqual([]);
    expect(optionalFeatureSlots(undefined, sub, 8)).toEqual([{ name: 'Maneuvers', featureTypes: ['MV:B'], max: 5 }]);
  });

  it('merges class rows with subclass rows (Fighter fighting style + Battle Master)', () => {
    const cls = [{ name: 'Fighting Style', featureType: ['FS:F'], progression: { 1: 1 } }];
    const sub = [{ name: 'Maneuvers', featureType: ['MV:B'], progression: { 3: 3 } }];
    expect(optionalFeatureSlots(cls, sub, 3)).toEqual([
      { name: 'Fighting Style', featureTypes: ['FS:F'], max: 1 },
      { name: 'Maneuvers', featureTypes: ['MV:B'], max: 3 },
    ]);
  });
});
