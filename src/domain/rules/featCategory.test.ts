import { describe, expect, it } from 'vitest';
import { featCategory, featLevelRequirement, isAsiFeatEligible } from './featCategory';

describe('featCategory', () => {
  it('maps the raw codes', () => {
    expect(featCategory('O')).toBe('origin');
    expect(featCategory('G')).toBe('general');
    expect(featCategory('FS')).toBe('fighting-style');
    expect(featCategory('FS:R')).toBe('fighting-style');
    expect(featCategory('EB')).toBe('epic-boon');
    expect(featCategory(undefined)).toBe('other');
  });
});

describe('featLevelRequirement', () => {
  it('reads a level prerequisite, defaulting to 1', () => {
    expect(featLevelRequirement([{ level: 4 }])).toBe(4);
    expect(featLevelRequirement([{ level: { level: 19 } }])).toBe(19);
    expect(featLevelRequirement(undefined)).toBe(1);
    expect(featLevelRequirement([{ ability: {} }])).toBe(1);
  });
});

describe('isAsiFeatEligible', () => {
  it('2014: any feat qualifies (no categories)', () => {
    expect(isAsiFeatEligible({ category: 'O' }, 1, '5e')).toBe(true);
    expect(isAsiFeatEligible({ category: undefined }, 1, '5e')).toBe(true);
  });

  it('2024: only General feats, meeting their level requirement', () => {
    const general = { category: 'G', prerequisite: [{ level: 4 }] };
    expect(isAsiFeatEligible(general, 3, '5.5e')).toBe(false); // below level 4
    expect(isAsiFeatEligible(general, 4, '5.5e')).toBe(true);
    expect(isAsiFeatEligible({ category: 'O' }, 20, '5.5e')).toBe(false); // Origin — not via ASI
    expect(isAsiFeatEligible({ category: 'EB' }, 20, '5.5e')).toBe(false); // Epic Boon — not via ASI
  });
});
