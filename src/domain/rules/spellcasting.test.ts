import { describe, expect, it } from 'vitest';
import { classHasSpellChoices, isKnownCaster, isPreparedCaster, maxKnownCantrips, maxKnownSpells, maxPreparedSpells, maxSpellLevelForClass } from './spellcasting';

describe('isPreparedCaster by edition', () => {
  it('2014: only the classic prepared-list casters (Bard/Sorcerer are known casters)', () => {
    expect(isPreparedCaster('Cleric')).toBe(true);
    expect(isPreparedCaster('Wizard')).toBe(true);
    expect(isPreparedCaster('Bard')).toBe(false);
    expect(isPreparedCaster('Sorcerer')).toBe(false);
    expect(isPreparedCaster('Warlock')).toBe(false);
  });

  it('2024: every caster prepares (Bard/Sorcerer/Warlock switch to prepared)', () => {
    for (const c of ['Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard']) {
      expect(isPreparedCaster(c, '5.5e'), c).toBe(true);
    }
    expect(isPreparedCaster('Fighter', '5.5e')).toBe(false);
  });
});

describe('maxPreparedSpells by edition', () => {
  it('2014 Cleric = level + WIS mod (min 1); 2024 Cleric = flat table', () => {
    expect(maxPreparedSpells('Cleric', 5, 3)).toBe(8);           // 2014: 5 + 3
    expect(maxPreparedSpells('Cleric', 5, 3, '5.5e')).toBe(9);   // 2024 table @5
    expect(maxPreparedSpells('Cleric', 1, 0, '5.5e')).toBe(4);   // ability mod ignored in 2024
  });
});

describe('classHasSpellChoices (whether the creation wizard shows a Spells step)', () => {
  it('is false for non-casters at every level', () => {
    for (const cls of ['Barbarian', 'Fighter', 'Monk', 'Rogue']) {
      expect(classHasSpellChoices(cls, 20)).toBe(false);
    }
  });

  it('is true from level 1 for classes with cantrips (Bard, Cleric, Wizard, Sorcerer, Warlock)', () => {
    for (const cls of ['Bard', 'Cleric', 'Wizard', 'Sorcerer', 'Warlock']) {
      expect(classHasSpellChoices(cls, 1)).toBe(true);
    }
  });

  it('is false for half-casters at level 1 (no spellcasting yet) but true from level 2', () => {
    expect(classHasSpellChoices('Paladin', 1)).toBe(false);
    expect(classHasSpellChoices('Ranger', 1)).toBe(false);
    expect(classHasSpellChoices('Paladin', 2)).toBe(true);
    expect(classHasSpellChoices('Ranger', 2)).toBe(true);
  });

  it('follows a caster subclass — Eldritch Knight / Arcane Trickster from level 3', () => {
    expect(classHasSpellChoices('Fighter', 2, 'Eldritch Knight')).toBe(false);
    expect(classHasSpellChoices('Fighter', 3, 'Eldritch Knight')).toBe(true);
    expect(classHasSpellChoices('Rogue', 3, 'Arcane Trickster')).toBe(true);
  });
});

describe('isPreparedCaster', () => {
  it('is true for prepared casters, case-insensitively', () => {
    expect(isPreparedCaster('Cleric')).toBe(true);
    expect(isPreparedCaster('wizard')).toBe(true);
    expect(isPreparedCaster('Artificer')).toBe(true);
  });

  it('is false for known casters and non-casters', () => {
    expect(isPreparedCaster('Bard')).toBe(false);
    expect(isPreparedCaster('Sorcerer')).toBe(false);
    expect(isPreparedCaster('Warlock')).toBe(false);
    expect(isPreparedCaster('Ranger')).toBe(false);
    expect(isPreparedCaster('Fighter')).toBe(false);
  });
});

describe('maxPreparedSpells', () => {
  it('is class level + ability mod for full prepared casters', () => {
    expect(maxPreparedSpells('Cleric', 5, 3)).toBe(8);
    expect(maxPreparedSpells('Wizard', 1, 2)).toBe(3);
  });

  it('is half class level (floored) + ability mod for Paladin/Artificer', () => {
    expect(maxPreparedSpells('Paladin', 5, 3)).toBe(5); // floor(5/2)=2, +3
    expect(maxPreparedSpells('Artificer', 4, 1)).toBe(3); // floor(4/2)=2, +1
  });

  it('floors at a minimum of 1', () => {
    expect(maxPreparedSpells('Cleric', 1, -1)).toBe(1);
    expect(maxPreparedSpells('Paladin', 1, -2)).toBe(1);
  });
});

describe('isKnownCaster', () => {
  it('is true for known casters, case-insensitively', () => {
    expect(isKnownCaster('Bard')).toBe(true);
    expect(isKnownCaster('sorcerer')).toBe(true);
    expect(isKnownCaster('Warlock')).toBe(true);
    expect(isKnownCaster('Ranger')).toBe(true);
  });

  it('is false for prepared casters and non-casters', () => {
    expect(isKnownCaster('Cleric')).toBe(false);
    expect(isKnownCaster('Wizard')).toBe(false);
    expect(isKnownCaster('Fighter')).toBe(false);
  });
});

describe('maxKnownSpells', () => {
  it('looks up the known-caster table by level', () => {
    expect(maxKnownSpells('Bard', 1)).toBe(4);
    expect(maxKnownSpells('Bard', 10)).toBe(14);
    expect(maxKnownSpells('Sorcerer', 5)).toBe(6);
  });

  it('is 0 for Ranger at level 1 (no spells until level 2)', () => {
    expect(maxKnownSpells('Ranger', 1)).toBe(0);
    expect(maxKnownSpells('Ranger', 2)).toBe(2);
  });

  it('is the cumulative spellbook growth for Wizard', () => {
    expect(maxKnownSpells('Wizard', 1)).toBe(6);
    expect(maxKnownSpells('Wizard', 2)).toBe(8);
    expect(maxKnownSpells('Wizard', 3)).toBe(10);
  });

  it('is 0 for classes with no known-spell table', () => {
    expect(maxKnownSpells('Cleric', 5)).toBe(0);
    expect(maxKnownSpells('Fighter', 5)).toBe(0);
  });
});

describe('subclass casters (Eldritch Knight / Arcane Trickster)', () => {
  it('gives a 1/3 progression via the subclass', () => {
    expect(maxSpellLevelForClass('Fighter', 3, 'Eldritch Knight')).toBe(1);
    expect(maxSpellLevelForClass('Fighter', 7, 'Eldritch Knight')).toBe(2);
    expect(maxSpellLevelForClass('Fighter', 7)).toBe(0);
  });

  it('treats them as known casters', () => {
    expect(isKnownCaster('Fighter', 'Eldritch Knight')).toBe(true);
    expect(isKnownCaster('Rogue', 'Arcane Trickster')).toBe(true);
    expect(isKnownCaster('Fighter')).toBe(false);
    expect(isKnownCaster('Fighter', 'Champion')).toBe(false);
  });

  it('uses the subclass known/cantrip tables', () => {
    expect(maxKnownSpells('Rogue', 3, 'Arcane Trickster')).toBe(3);
    expect(maxKnownCantrips('Fighter', 3, 'Eldritch Knight')).toBe(2);
    expect(maxKnownSpells('Fighter', 3)).toBe(0);
  });
});

describe('maxKnownCantrips', () => {
  it('looks up the cantrip table by level', () => {
    expect(maxKnownCantrips('Wizard', 1)).toBe(3);
    expect(maxKnownCantrips('Cleric', 4)).toBe(4);
  });

  it('is 0 for classes with no cantrips', () => {
    expect(maxKnownCantrips('Paladin', 5)).toBe(0);
    expect(maxKnownCantrips('Ranger', 5)).toBe(0);
  });
});
