import { describe, expect, it } from 'vitest';
import { featCategory, featLevelRequirement, featPrereqSummary, isAsiFeatEligible } from './featCategory';

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

  it('2024: General feats need their level; Origin feats always qualify', () => {
    const general = { category: 'G', prerequisite: [{ level: 4 }] };
    expect(isAsiFeatEligible(general, 3, '5.5e')).toBe(false); // below level 4
    expect(isAsiFeatEligible(general, 4, '5.5e')).toBe(true);
    expect(isAsiFeatEligible({ category: 'O' }, 4, '5.5e')).toBe(true); // e.g. Tough, Alert
  });

  it('2024: Epic Boons need level 19; Fighting Style feats need the Fighting Style feature', () => {
    expect(isAsiFeatEligible({ category: 'EB', prerequisite: [{ level: 19 }] }, 16, '5.5e')).toBe(false);
    expect(isAsiFeatEligible({ category: 'EB', prerequisite: [{ level: 19 }] }, 19, '5.5e')).toBe(true);
    const fs = { category: 'FS', prerequisite: [{ feature: ['Fighting Style'] }] };
    expect(isAsiFeatEligible(fs, 8, '5.5e', ['Cleric'])).toBe(false);
    expect(isAsiFeatEligible(fs, 8, '5.5e', ['Cleric', 'Fighter'])).toBe(true);
  });
});

describe('featPrereqSummary', () => {
  it('summarizes non-level prerequisites', () => {
    expect(featPrereqSummary([{ level: 4, spellcasting2020: true }])).toBe('Spellcasting');
    expect(featPrereqSummary([{ level: 4, ability: [{ str: 13 }, { dex: 13 }] }])).toBe('STR 13 or DEX 13');
    expect(featPrereqSummary([{ level: 4 }])).toBeNull();
    expect(featPrereqSummary(undefined)).toBeNull();
  });
});
