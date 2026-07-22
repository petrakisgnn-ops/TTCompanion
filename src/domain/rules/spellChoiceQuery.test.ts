import { describe, expect, it } from 'vitest';
import { matchesSpellChoiceQuery, parseSpellChoiceQuery } from './spellChoiceQuery';

describe('parseSpellChoiceQuery', () => {
  it('parses a level + class filter', () => {
    expect(parseSpellChoiceQuery('level=1|class=Bard')).toEqual({
      levels: [1], classFilter: ['Bard'], schoolFilter: undefined,
    });
  });

  it('parses a class filter listing more than one eligible class (Strixhaven Initiate shape)', () => {
    expect(parseSpellChoiceQuery('level=1|class=cleric;wizard')).toEqual({
      levels: [1], classFilter: ['cleric', 'wizard'], schoolFilter: undefined,
    });
  });

  it('parses a level + school filter with multiple schools', () => {
    expect(parseSpellChoiceQuery('level=1|school=E;D')).toEqual({
      levels: [1], classFilter: undefined, schoolFilter: ['E', 'D'],
    });
  });

  it('parses a semicolon-separated level range with no other filters', () => {
    expect(parseSpellChoiceQuery('level=0;1;2;3;4;5')).toEqual({
      levels: [0, 1, 2, 3, 4, 5], classFilter: undefined, schoolFilter: undefined,
    });
  });

  it('parses a level + count-style class filter (Magic Initiate cantrips)', () => {
    expect(parseSpellChoiceQuery('level=0|class=Bard')).toEqual({
      levels: [0], classFilter: ['Bard'], schoolFilter: undefined,
    });
  });

  it('ignores unrecognized filter keys rather than throwing', () => {
    expect(parseSpellChoiceQuery('level=1|race=Elf')).toEqual({
      levels: [1], classFilter: undefined, schoolFilter: undefined,
    });
  });

  it('returns null when no level filter is present', () => {
    expect(parseSpellChoiceQuery('class=Bard')).toBeNull();
  });
});

describe('matchesSpellChoiceQuery', () => {
  it('matches on level', () => {
    const query = parseSpellChoiceQuery('level=1|class=Bard')!;
    expect(matchesSpellChoiceQuery({ level: 1, school: 'A' }, query)).toBe(true);
    expect(matchesSpellChoiceQuery({ level: 2, school: 'A' }, query)).toBe(false);
  });

  it('matches on school when a school filter is present', () => {
    const query = parseSpellChoiceQuery('level=1|school=E;D')!;
    expect(matchesSpellChoiceQuery({ level: 1, school: 'E' }, query)).toBe(true);
    expect(matchesSpellChoiceQuery({ level: 1, school: 'V' }, query)).toBe(false);
  });

  it('ignores school when no school filter is present', () => {
    const query = parseSpellChoiceQuery('level=1|class=Bard')!;
    expect(matchesSpellChoiceQuery({ level: 1, school: 'V' }, query)).toBe(true);
  });
});
