import { describe, expect, it } from 'vitest';
import { loadClassJson, pickClassEntry } from './__fixtures__/classJson';
import { extractClassTable, parseCell, parseLabel } from './__fixtures__/classTable';

const table = (cls: string) => extractClassTable(pickClassEntry(loadClassJson(cls)).classTableGroups);

describe('parseLabel', () => {
  it('strips {@filter …} markup to the display label', () => {
    expect(parseLabel('{@filter Cantrips Known|spells|level=0|class=Wizard}')).toBe('Cantrips Known');
    expect(parseLabel('{@filter 1st|spells|level=1|class=bard}')).toBe('1st');
  });
  it('leaves plain labels unchanged', () => {
    expect(parseLabel('Rages')).toBe('Rages');
    expect(parseLabel('Slot Level')).toBe('Slot Level');
  });
});

describe('parseCell', () => {
  it('reads numbers and numeric strings', () => {
    expect(parseCell(3)).toBe(3);
    expect(parseCell('2')).toBe(2);
    expect(parseCell(0)).toBe(0);
  });
  it('reads ordinals (Warlock slot level cells)', () => {
    expect(parseCell('{@filter 5th|spells|level=5|class=Warlock}')).toBe(5);
    expect(parseCell('1st')).toBe(1);
  });
  it('returns null for sentinels and structured cells', () => {
    expect(parseCell('Unlimited')).toBeNull();
    expect(parseCell({ type: 'bonus', value: 2 })).toBeNull();
    expect(parseCell({ type: 'dice', toRoll: [{ number: 1, faces: 4 }] })).toBeNull();
    expect(parseCell({ type: 'bonusSpeed', value: 10 })).toBeNull();
  });
});

describe('extractClassTable — Barbarian', () => {
  const t = table('Barbarian');
  it('captures Rages with the level-20 "Unlimited" preserved as null', () => {
    expect(t.columns['Rages']).toEqual(
      [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, null],
    );
  });
  it('flags Rage Damage as non-numeric (bonus cells)', () => {
    expect(t.nonNumericColumns).toContain('Rage Damage');
    expect(t.columns['Rage Damage']).toBeUndefined();
  });
  it('has no spell-slot matrix', () => {
    expect(t.spellSlots).toBeNull();
  });
});

describe('extractClassTable — Wizard', () => {
  const t = table('Wizard');
  it('captures Cantrips Known', () => {
    expect(t.columns['Cantrips Known']).toEqual(
      [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
    );
  });
  it('captures the 20×9 spell-slot matrix', () => {
    expect(t.spellSlots).not.toBeNull();
    expect(t.spellSlots!.length).toBe(20);
    expect(t.spellSlots![0]).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(t.spellSlots![4]).toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);
    expect(t.spellSlots![19]).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
  });
});

describe('extractClassTable — Warlock', () => {
  const t = table('Warlock');
  it('parses pact count, ordinal slot level, and invocations columns', () => {
    expect(t.columns['Spell Slots']?.[0]).toBe(1);   // pact slot count @1
    expect(t.columns['Spell Slots']?.[19]).toBe(4);  // @20
    expect(t.columns['Slot Level']?.[0]).toBe(1);
    expect(t.columns['Slot Level']?.[19]).toBe(5);
    expect(t.columns['Invocations Known']?.[0]).toBe(0);
    expect(t.columns['Invocations Known']?.[19]).toBe(8);
  });
});

describe('extractClassTable — Monk', () => {
  const t = table('Monk');
  it('captures Ki Points and flags dice/speed columns as non-numeric', () => {
    expect(t.columns['Ki Points']?.[0]).toBe(0);
    expect(t.columns['Ki Points']?.[1]).toBe(2);
    expect(t.columns['Ki Points']?.[19]).toBe(20);
    expect(t.nonNumericColumns).toEqual(expect.arrayContaining(['Martial Arts', 'Unarmored Movement']));
  });
});
