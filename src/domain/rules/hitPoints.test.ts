import { describe, expect, it } from 'vitest';
import { effectiveMaxHp, withBaseMax, withMaxModifier, withMaxModifierNote, type HitPointsState } from './hitPoints';

const hp: HitPointsState = { max: 40, current: 30, temp: 0 };

describe('effectiveMaxHp', () => {
  it('adds the modifier, minimum 1', () => {
    expect(effectiveMaxHp(hp)).toBe(40);
    expect(effectiveMaxHp({ ...hp, maxModifier: 5 })).toBe(45);
    expect(effectiveMaxHp({ ...hp, maxModifier: -100 })).toBe(1);
  });
});

describe('withMaxModifier', () => {
  it('Aid raises max and current together', () => {
    expect(withMaxModifier(hp, 5)).toMatchObject({ maxModifier: 5, current: 35 });
  });
  it('a curse lowers max and caps current', () => {
    expect(withMaxModifier({ ...hp, current: 40 }, -10)).toMatchObject({ maxModifier: -10, current: 30 });
    expect(withMaxModifier(hp, -5)).toMatchObject({ current: 30 }); // already below the new max
  });
  it('ending Aid drops current back within the max', () => {
    const aided = withMaxModifier({ ...hp, current: 40 }, 5); // 45/45
    expect(withMaxModifier(aided, 0)).toMatchObject({ maxModifier: 0, current: 40 });
  });
});

describe('withBaseMax', () => {
  it('moves current with the permanent max', () => {
    expect(withBaseMax(hp, 44)).toMatchObject({ max: 44, current: 34 });
    expect(withBaseMax(hp, 20)).toMatchObject({ max: 20, current: 10 });
  });
  it('never goes below 1 max / 0 current', () => {
    expect(withBaseMax({ ...hp, current: 2 }, 0)).toMatchObject({ max: 1, current: 0 });
  });
});

describe('max HP notes', () => {
  it('keeps the note while the change lasts and clears it with the change', () => {
    const aided = withMaxModifier(hp, 5, 'Aid (2nd level)');
    expect(aided.maxModifierNote).toBe('Aid (2nd level)');
    expect(withMaxModifier(aided, 10).maxModifierNote).toBe('Aid (2nd level)');
    expect(withMaxModifier(aided, 0).maxModifierNote).toBeUndefined();
  });
  it('a blank note removes it', () => {
    expect(withMaxModifierNote({ ...hp, maxModifierNote: 'x' }, '  ').maxModifierNote).toBeUndefined();
    expect(withMaxModifierNote(hp, ' Curse ').maxModifierNote).toBe('Curse');
  });
});
